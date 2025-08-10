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
            # Excel file - check for Intesa San Paolo format
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
    
    def parse_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse expense file and return normalized data"""
        file_format = self.detect_file_format(file_path)
        
        if file_format == "intesa_sanpaolo":
            return self.parse_intesa_sanpaolo_file(file_path)
        elif file_format == "activity_csv":
            return self.parse_activity_csv_file(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_format}. Supported formats: Excel (Intesa San Paolo), CSV (Activity format)")
    
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
