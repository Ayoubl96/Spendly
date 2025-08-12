"""
Service for importing expenses from bank files (Excel/CSV)
"""

import re
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.orm import Session
from app.crud.crud_categorization_rule import categorization_rule_crud
from app.crud.crud_expense import expense_crud
from app.crud.crud_category import category_crud
import hashlib
import logging

logger = logging.getLogger(__name__)


class ExpenseImportService:
    """Service for parsing and importing expense files"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def detect_file_format(self, file_path: str, file_content: bytes = None) -> str:
        """Detect bank file format based on content"""
        if file_path.lower().endswith('.csv'):
            # Try to detect CSV format by reading first few lines
            try:
                df_sample = pd.read_csv(file_path, nrows=5)
                columns = [col.lower() for col in df_sample.columns]
                
                # Check for activity.csv format (Data, Descrizione, Importo)
                if any('data' in col for col in columns) and any('descrizione' in col for col in columns) and any('importo' in col for col in columns):
                    return "activity_csv"
                
                # Add more CSV format detection here in the future
                return "generic_csv"
                
            except Exception:
                return "unknown_csv"
        else:
            # Excel file - try to detect format by reading a sample
            try:
                df_sample = pd.read_excel(file_path, nrows=25, header=None)
                
                # Check for Italian bank format (Lista Operazione sheet)
                for i in range(len(df_sample)):
                    row = df_sample.iloc[i]
                    row_str = ' '.join([str(x) for x in row if pd.notna(x)])
                    if 'Lista Operazione' in row_str or ('Data' in row_str and 'Operazione' in row_str and 'Importo' in row_str):
                        return "italian_bank_list"
                
                # Check for standard Intesa San Paolo format (Data contabile)
                for i in range(len(df_sample)):
                    row = df_sample.iloc[i]
                    row_str = ' '.join([str(x) for x in row if pd.notna(x)])
                    if 'Data contabile' in row_str:
                        return "intesa_sanpaolo"
                
                # Default to Intesa San Paolo for other Excel files
                return "intesa_sanpaolo"
                
            except Exception:
                return "intesa_sanpaolo"
    
    def parse_intesa_sanpaolo_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse Intesa San Paolo Excel file format"""
        try:
            # Read Excel file
            df_raw = pd.read_excel(file_path, sheet_name=0, header=None)
            
            # Find header row (contains "Data contabile")
            header_row = None
            for i, row in df_raw.iterrows():
                if any('Data contabile' in str(cell) for cell in row if pd.notna(cell)):
                    header_row = i
                    break
            
            if header_row is None:
                raise ValueError("Could not find header row with 'Data contabile'")
            
            # Read with proper header
            df = pd.read_excel(file_path, sheet_name=0, header=header_row)
            df_clean = df.dropna(how='all').reset_index(drop=True)
            
            # Filter to actual transactions (exclude balance rows, etc.)
            transactions = df_clean[
                df_clean['Data contabile'].notna() & 
                (df_clean['Addebiti'].notna() | df_clean['Accrediti'].notna()) &
                (df_clean['Descrizione'] != 'Saldo contabile iniziale in Euro')
            ]
            
            expenses = []
            
            for _, row in transactions.iterrows():
                # Skip credits for now (as requested)
                if pd.notna(row['Accrediti']) and row['Accrediti'] > 0:
                    continue
                
                # Skip internal transfers and card statement debits (as requested)
                descrizione = str(row.get('Descrizione', '')).upper()
                if any(skip_type in descrizione for skip_type in [
                    'DISPOSIZIONE DI GIROCONTO',
                    'ADDEBITO SALDO E/C CARTA DI CREDITO',
                    'COMMISSIONI E SPESE ADUE'
                ]):
                    continue
                
                # Only process debits (expenses)
                if not pd.notna(row['Addebiti']) or row['Addebiti'] >= 0:
                    continue
                
                # Extract expense data
                expense_data = self._extract_expense_data_intesa(row)
                if expense_data:
                    expenses.append(expense_data)
            
            return expenses
            
        except Exception as e:
            logger.error(f"Error parsing Intesa San Paolo file: {e}")
            raise ValueError(f"Failed to parse file: {e}")
    
    def parse_activity_csv_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse activity.csv format (Data, Descrizione, Importo)"""
        try:
            # Read CSV file
            df = pd.read_csv(file_path)
            
            # Validate required columns
            required_columns = ['Data', 'Descrizione', 'Importo']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            expenses = []
            
            for _, row in df.iterrows():
                # Skip invalid rows
                if pd.isna(row['Data']) or pd.isna(row['Descrizione']) or pd.isna(row['Importo']):
                    continue
                
                # Convert European number format (comma as decimal separator)
                try:
                    amount_str = str(row['Importo']).replace(',', '.')
                    amount = float(amount_str)
                except (ValueError, TypeError):
                    logger.warning(f"Could not parse amount: {row['Importo']}")
                    continue
                
                # Skip credits (negative amounts) as per requirements
                if amount < 0:
                    continue
                
                # Skip banking operations
                description = str(row['Descrizione']).upper()
                if any(skip_type in description for skip_type in [
                    'ADDEBITO IN C/C',
                    'IMPOSTA DI BOLLO',
                    'COMMISSIONI'
                ]):
                    continue
                
                # Extract expense data
                expense_data = self._extract_expense_data_activity_csv(row, amount)
                if expense_data:
                    expenses.append(expense_data)
            
            return expenses
            
        except Exception as e:
            logger.error(f"Error parsing activity CSV file: {e}")
            raise ValueError(f"Failed to parse CSV file: {e}")
    
    def _extract_expense_data_activity_csv(self, row, amount: float) -> Optional[Dict[str, Any]]:
        """Extract normalized expense data from activity CSV row"""
        try:
            description = str(row['Descrizione']).strip()
            
            # Extract vendor using CSV-specific patterns
            vendor = self._extract_vendor_activity_csv(description)
            
            # Infer payment method (mostly card for this type of data)
            payment_method = self._infer_payment_method_activity_csv(description)
            
            # Parse date (MM/DD/YYYY format)
            try:
                expense_date = pd.to_datetime(row['Data'], format='%m/%d/%Y').date()
            except Exception:
                logger.warning(f"Could not parse date: {row['Data']}")
                return None
            
            # Generate unique ID for deduplication
            unique_id = self._generate_expense_hash(
                expense_date, amount, vendor or '', description
            )
            
            return {
                'unique_id': unique_id,
                'expense_date': expense_date.isoformat(),
                'amount': amount,
                'currency': 'EUR',  # Assuming EUR for this CSV format
                'description': description,
                'vendor': vendor,
                'payment_method': payment_method,
                'notes': description,  # Use full description as notes
                'raw_data': {
                    'source': 'activity_csv',
                    'original_amount': str(row['Importo']),
                    'original_date': str(row['Data'])
                }
            }
            
        except Exception as e:
            logger.error(f"Error extracting expense data from CSV: {e}")
            return None
    
    def _extract_vendor_activity_csv(self, description: str) -> Optional[str]:
        """Extract vendor name from activity CSV description"""
        if not description:
            return None
        
        description = description.strip()
        
        # Pattern 1: PayPal transactions - "PAYPAL *VENDOR_NAME ..."
        if description.upper().startswith('PAYPAL *'):
            parts = description.split('PAYPAL *')[1].split()
            if parts:
                vendor = parts[0].strip()
                # Clean up common PayPal vendor patterns
                if vendor.endswith('APP'):
                    vendor = vendor[:-3]  # Remove 'APP' suffix
                return vendor[:50] if vendor else None
        
        # Pattern 2: Service providers - "SERVICE.IO transaction_id LOCATION"
        if '.IO ' in description.upper():
            vendor = description.split()[0].strip()
            return vendor[:50] if vendor else None
        
        # Pattern 3: Direct merchants - "VENDOR_NAME LOCATION"
        parts = description.split()
        if parts:
            # Take the first word/part as vendor name
            vendor = parts[0].strip()
            # Filter out transaction IDs and codes
            if len(vendor) > 2 and not vendor.isdigit():
                return vendor[:50]
        
        return None
    
    def _infer_payment_method_activity_csv(self, description: str) -> str:
        """Infer payment method from activity CSV description"""
        description_upper = description.upper()
        
        if 'PAYPAL' in description_upper:
            return 'other'  # PayPal transactions
        elif any(keyword in description_upper for keyword in ['CARD', 'POS']):
            return 'card'
        else:
            return 'card'  # Default for this type of data (likely card transactions)
    
    def _extract_expense_data_intesa(self, row) -> Optional[Dict[str, Any]]:
        """Extract normalized expense data from Intesa San Paolo row"""
        try:
            desc_ext = str(row.get('Descrizione estesa', ''))
            descrizione = str(row.get('Descrizione', ''))
            
            # Extract vendor
            vendor = self._extract_vendor_intesa(desc_ext, descrizione)
            
            # Infer payment method
            payment_method = self._infer_payment_method_intesa(descrizione, desc_ext)
            
            # Generate unique ID for deduplication
            expense_date = pd.to_datetime(row['Data contabile']).date()
            amount = abs(float(row['Addebiti']))
            
            unique_id = self._generate_expense_hash(
                expense_date, amount, vendor or '', descrizione
            )
            
            return {
                'unique_id': unique_id,
                'expense_date': expense_date.isoformat(),
                'amount': amount,
                'currency': 'EUR',
                'description': descrizione.strip(),
                'vendor': vendor,
                'payment_method': payment_method,
                'notes': desc_ext[:500],  # Limit notes length
                'raw_data': {
                    'data_valuta': pd.to_datetime(row['Data valuta']).date().isoformat() if pd.notna(row['Data valuta']) else None,
                    'addebiti': row['Addebiti'],
                    'accrediti': row['Accrediti'] if pd.notna(row['Accrediti']) else None,
                    'source': 'intesa_sanpaolo'
                }
            }
            
        except Exception as e:
            logger.error(f"Error extracting expense data: {e}")
            return None
    
    def _extract_vendor_intesa(self, desc_ext: str, descrizione: str) -> Optional[str]:
        """Extract vendor name from Intesa San Paolo transaction description"""
        if not desc_ext:
            return None
        
        # Pattern 1: "PRESSO [VENDOR]"
        presso_match = re.search(r'PRESSO\s+([^\n\r]+)', desc_ext, re.IGNORECASE)
        if presso_match:
            vendor = presso_match.group(1).strip()
            # Clean up common suffixes
            vendor = re.sub(r'\s+\w{2,3}$', '', vendor)  # Remove city codes
            return vendor[:100]  # Limit length
        
        # Pattern 2: "NOME: [VENDOR]"
        nome_match = re.search(r'NOME:\s*([^\n\r-]+)', desc_ext, re.IGNORECASE)
        if nome_match:
            vendor = nome_match.group(1).strip()
            vendor = vendor.split('-')[0].strip()  # Take part before dash
            return vendor[:100]
        
        # Pattern 3: For "PAGAMENTO TRAMITE POS", extract leading merchant name
        if 'PAGAMENTO TRAMITE POS' in descrizione.upper():
            # Take first part before dash or special chars
            vendor = desc_ext.split('-')[0].strip()
            vendor = re.sub(r'\s+\d{2}/\d{2}.*$', '', vendor)  # Remove date patterns
            if len(vendor) > 5 and not vendor.upper().startswith('EFFETTUATO'):
                return vendor[:100]
        
        return None
    
    def _infer_payment_method_intesa(self, descrizione: str, desc_ext: str) -> str:
        """Infer payment method from Intesa San Paolo transaction"""
        combined = (descrizione + ' ' + desc_ext).upper()
        
        if any(pos_type in combined for pos_type in ['POS', 'CARTA']):
            return 'card'
        elif any(transfer_type in combined for transfer_type in ['GIROCONTO', 'BONIFICO']):
            return 'bank_transfer'
        elif any(other_type in combined for other_type in ['ADUE', 'ADDEBITO']):
            return 'other'
        else:
            return 'other'
    
    def _generate_expense_hash(self, expense_date: date, amount: float, vendor: str, description: str) -> str:
        """Generate unique hash for expense deduplication"""
        # Normalize inputs
        vendor_normalized = (vendor or '').lower().strip()
        description_normalized = description.lower().strip()
        
        # Create hash input
        hash_input = f"{expense_date}|{amount:.2f}|{vendor_normalized}|{description_normalized}"
        
        # Generate SHA256 hash and take first 16 characters
        return hashlib.sha256(hash_input.encode()).hexdigest()[:16]
    
    def check_duplicates(self, user_id: str, expenses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Check for duplicate expenses against existing user expenses"""
        # Get existing expenses for the user (last 6 months to be safe)
        from datetime import timedelta
        six_months_ago = date.today() - timedelta(days=180)
        
        existing_expenses = expense_crud.get_by_user(
            self.db,
            user_id=user_id,
            start_date=six_months_ago,
            limit=10000  # Large limit to get all recent expenses
        )
        
        # Create set of existing expense hashes
        existing_hashes = set()
        for expense in existing_expenses:
            expense_hash = self._generate_expense_hash(
                expense.expense_date,
                float(expense.amount),
                expense.vendor or '',
                expense.description
            )
            existing_hashes.add(expense_hash)
        
        # Mark duplicates in import data
        for expense in expenses:
            expense['is_duplicate'] = expense['unique_id'] in existing_hashes
        
        return expenses
    
    def get_categorization_suggestions(self, user_id: str, expenses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get categorization suggestions for expenses"""
        for expense in expenses:
            # Try rule-based categorization first
            rule_match = categorization_rule_crud.get_best_match(
                self.db, 
                user_id=user_id, 
                expense_data=expense
            )
            
            if rule_match:
                expense['suggested_category_id'] = rule_match['category_id']
                expense['suggested_subcategory_id'] = rule_match['subcategory_id']
                expense['suggestion_confidence'] = rule_match['confidence']
                expense['suggestion_reason'] = f"Rule: {rule_match['rule_name']}"
                expense['suggestion_source'] = 'rule'
            else:
                # Fall back to heuristic categorization
                suggestion = self._get_heuristic_suggestion(expense)
                if suggestion:
                    expense.update(suggestion)
        
        return expenses
    
    def _get_heuristic_suggestion(self, expense: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get heuristic categorization suggestion based on vendor/description"""
        vendor = (expense.get('vendor') or '').lower()
        description = (expense.get('description') or '').lower()
        
        # Define heuristic mappings (these could be moved to a config file)
        heuristics = [
            # Food & Dining
            (['pizz', 'ristorante', 'bar', 'cafe', 'pizza', 'piadineria', 'mc donald', 'burger', 'deliveroo', 'glovo', 'billy tacos'], 'Food & Dining', 85),
            
            # Entertainment & Subscriptions
            (['netflix', 'youtube', 'spotify', 'apple.com', 'itunesappst', 'twitchinter', 'priority pass'], 'Entertainment', 90),
            
            # Sports & Fitness  
            (['sport', 'gym', 'fitness', 'palestra', 'playtomic'], 'Sports & Fitness', 90),
            
            # Transportation
            (['uber', 'taxi', 'bus', 'metro', 'train', 'benzina', 'eni', 'esso', 'shell'], 'Transportation', 75),
            
            # Shopping & Retail
            (['amazon', 'shopping', 'store', 'negozio', 'market', 'tempur'], 'Shopping', 75),
            
            # Technology & Software
            (['google', 'microsoft', 'adobe', 'nordsec', 'support@beamjobs'], 'Technology', 80),
            
            # Telecommunications
            (['iliad', 'tim', 'vodafone', 'wind', 'telefon', 'internet'], 'Telecommunications', 85),
            
            # Travel & Accommodation
            (['hotel', 'hostel', 'booking', 'airbnb', 'flight', 'aeroporto'], 'Travel', 80),
            
            # Financial Services
            (['bank', 'revolut', 'paypal', 'credit', 'prestito'], 'Financial Services', 75),
            
            # Health & Medical
            (['farmacia', 'pharmacy', 'medic', 'hospital', 'clinic'], 'Health & Medical', 85),
            
            # Personal Services
            (['pickedgroup', 'marcofincato'], 'Personal Services', 70),
        ]
        
        combined_text = f"{vendor} {description}"
        
        for keywords, category_name, confidence in heuristics:
            if any(keyword in combined_text for keyword in keywords):
                return {
                    'suggested_category_id': None,  # Would need to map to actual category IDs
                    'suggested_subcategory_id': None,
                    'suggestion_confidence': confidence,
                    'suggestion_reason': f"Heuristic: {category_name}",
                    'suggestion_source': 'heuristic',
                    'suggested_category_name': category_name
                }
        
        return {
            'suggested_category_id': None,
            'suggested_subcategory_id': None,
            'suggestion_confidence': 0,
            'suggestion_reason': 'No suggestion available',
            'suggestion_source': 'none'
        }
    
    def parse_italian_bank_list_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse Italian bank 'Lista Operazione' Excel file format"""
        try:
            # Read Excel file without headers first
            df_raw = pd.read_excel(file_path, header=None)
            
            # Find the header row (should be around row 19)
            header_row = None
            for i in range(min(25, len(df_raw))):
                row = df_raw.iloc[i]
                row_str = ' '.join([str(x) for x in row if pd.notna(x)])
                if 'Data' in row_str and 'Operazione' in row_str and 'Importo' in row_str:
                    header_row = i
                    break
            
            if header_row is None:
                raise ValueError("Could not find header row with transaction columns")
            
            # Expected columns based on analysis:
            # 0: Data, 1: Operazione, 2: Dettagli, 3: Conto o carta, 4: Contabilizzazione, 5: Categoria, 6: Valuta, 7: Importo
            
            expenses = []
            
            # Process rows after header
            for i in range(header_row + 1, len(df_raw)):
                row = df_raw.iloc[i]
                
                # Check if this is a transaction row (has date and amount)
                if pd.notna(row.iloc[0]) and pd.notna(row.iloc[7]):
                    try:
                        # Parse date
                        expense_date = pd.to_datetime(row.iloc[0]).date()
                        
                        # Parse amount (negative values are expenses)
                        amount_value = row.iloc[7]
                        if isinstance(amount_value, (int, float)) and amount_value < 0:
                            amount = abs(float(amount_value))
                            
                            # Extract fields
                            operation_type = str(row.iloc[1]) if pd.notna(row.iloc[1]) else ""
                            vendor_details = str(row.iloc[2]) if pd.notna(row.iloc[2]) else ""
                            account_card = str(row.iloc[3]) if pd.notna(row.iloc[3]) else ""
                            accounting_status = str(row.iloc[4]) if pd.notna(row.iloc[4]) else ""
                            category = str(row.iloc[5]) if pd.notna(row.iloc[5]) else ""
                            currency = str(row.iloc[6]) if pd.notna(row.iloc[6]) else "EUR"
                            
                            # Extract vendor from details
                            vendor = self._extract_vendor_italian_bank(vendor_details, operation_type)
                            
                            # Create description
                            description = f"{operation_type}: {vendor_details}".strip(": ")
                            
                            # Infer payment method from account/card info
                            payment_method = self._infer_payment_method_italian_bank(account_card, operation_type)
                            
                            # Generate unique ID for deduplication (include row index to avoid duplicates)
                            unique_id = hashlib.md5(
                                f"{expense_date}_{amount}_{vendor}_{description[:50]}_{i}".encode()
                            ).hexdigest()[:16]
                            
                            # Extract notes from accounting status and category
                            notes_parts = []
                            if accounting_status and accounting_status != "CONTABILIZZATO":
                                notes_parts.append(f"Status: {accounting_status}")
                            if category and category != "Altre uscite":
                                notes_parts.append(f"Bank Category: {category}")
                            notes = "; ".join(notes_parts) if notes_parts else None
                            
                            expense_data = {
                                'unique_id': unique_id,
                                'expense_date': expense_date.isoformat(),
                                'amount': amount,
                                'currency': currency,
                                'description': description[:200],  # Limit description length
                                'vendor': vendor,
                                'payment_method': payment_method,
                                'notes': notes,
                                'category_id': None,
                                'subcategory_id': None,
                                'tags': [],
                                'raw_data': {
                                    'operation_type': operation_type,
                                    'details': vendor_details,
                                    'account_card': account_card,
                                    'accounting_status': accounting_status,
                                    'bank_category': category,
                                    'original_amount': amount_value
                                }
                            }
                            
                            expenses.append(expense_data)
                            
                    except Exception as e:
                        logger.warning(f"Error parsing row {i}: {e}")
                        continue
            
            return expenses
            
        except Exception as e:
            logger.error(f"Error parsing Italian bank list file: {e}")
            raise ValueError(f"Failed to parse Italian bank file: {str(e)}")
    
    def _extract_vendor_italian_bank(self, details: str, operation_type: str) -> Optional[str]:
        """Extract vendor name from Italian bank transaction details"""
        if not details:
            return None
        
        details = details.strip()
        
        # For POS payments, the vendor is usually at the beginning
        if 'Pos' in operation_type:
            # Simple vendor extraction - take the first part before common separators
            vendor = details.split(' ')[0].strip()
            if vendor and len(vendor) > 1:
                return vendor[:50]
        
        # For other operations, try to extract meaningful vendor info
        # Remove common transaction codes and patterns
        cleaned = details
        
        # Remove date patterns (DD/MM or DD/MMYYYY)
        import re
        cleaned = re.sub(r'\b\d{2}/\d{2}(\d{4})?\b', '', cleaned)
        
        # Remove card number patterns
        cleaned = re.sub(r'Carta N\.\d+\s+XXXX\s+XXXX\s+\w+', '', cleaned)
        cleaned = re.sub(r'ABI\s+\d+', '', cleaned)
        cleaned = re.sub(r'COD\.\d+/\d+', '', cleaned)
        
        # Take the first meaningful part
        parts = cleaned.split()
        if parts:
            vendor = parts[0].strip()
            if vendor and len(vendor) > 2 and not vendor.isdigit():
                return vendor[:50]
        
        return None
    
    def _infer_payment_method_italian_bank(self, account_card: str, operation_type: str) -> str:
        """Infer payment method from Italian bank transaction info"""
        if not account_card:
            return 'other'
        
        account_card_upper = account_card.upper()
        operation_upper = operation_type.upper()
        
        # Check for card patterns
        if any(word in account_card_upper for word in ['CARD', 'VISA', 'MASTERCARD', 'MC']):
            return 'card'
        elif 'POS' in operation_upper:
            return 'card'
        elif 'CONTO' in account_card_upper:
            if 'TRANSFER' in operation_upper or 'GIROCONTO' in operation_upper:
                return 'bank_transfer'
            else:
                return 'card'  # Assume card for most account transactions
        else:
            return 'other'
    
    def parse_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse expense file and return normalized data"""
        file_format = self.detect_file_format(file_path)
        
        if file_format == "intesa_sanpaolo":
            return self.parse_intesa_sanpaolo_file(file_path)
        elif file_format == "italian_bank_list":
            return self.parse_italian_bank_list_file(file_path)
        elif file_format == "activity_csv":
            return self.parse_activity_csv_file(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_format}. Supported formats: Excel (Intesa San Paolo, Italian Bank List), CSV (Activity format)")
    
    def preview_import(
        self, 
        user_id: str, 
        file_path: str
    ) -> Dict[str, Any]:
        """Generate import preview with suggestions and duplicate detection"""
        try:
            # Parse file
            expenses = self.parse_file(file_path)
            
            if not expenses:
                return {
                    'success': False,
                    'error': 'No valid expenses found in file',
                    'expenses': [],
                    'summary': {}
                }
            
            # Check for duplicates
            expenses = self.check_duplicates(user_id, expenses)
            
            # Get categorization suggestions
            expenses = self.get_categorization_suggestions(user_id, expenses)
            
            # Generate summary
            total_count = len(expenses)
            duplicate_count = sum(1 for e in expenses if e.get('is_duplicate', False))
            new_count = total_count - duplicate_count
            total_amount = sum(e['amount'] for e in expenses if not e.get('is_duplicate', False))
            
            summary = {
                'total_transactions': total_count,
                'new_transactions': new_count,
                'duplicate_transactions': duplicate_count,
                'total_amount': float(total_amount),
                'currency': 'EUR',
                'date_range': {
                    'start': min(e['expense_date'] for e in expenses) if expenses else None,
                    'end': max(e['expense_date'] for e in expenses) if expenses else None
                },
                'categorization_stats': {
                    'rule_matches': sum(1 for e in expenses if e.get('suggestion_source') == 'rule'),
                    'heuristic_matches': sum(1 for e in expenses if e.get('suggestion_source') == 'heuristic'),
                    'no_suggestions': sum(1 for e in expenses if e.get('suggestion_source') == 'none')
                }
            }
            
            return {
                'success': True,
                'expenses': expenses,
                'summary': summary
            }
            
        except Exception as e:
            logger.error(f"Error in preview_import: {e}")
            return {
                'success': False,
                'error': str(e),
                'expenses': [],
                'summary': {}
            }
