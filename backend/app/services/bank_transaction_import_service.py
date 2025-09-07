import logging
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.services.enable_banking_service import enable_banking_service
from app.services.expense_import_service import ExpenseImportService
from app.schemas.bank_connection import Transaction
from app.schemas.expense import ExpenseCreate
from app.crud.crud_expense import expense_crud
from decimal import Decimal

class BankTransactionImportService:
    def __init__(self, db: Session):
        self.db = db
        self.expense_import_service = ExpenseImportService(db)

    def _extract_description(self, remittance_info):
        if not remittance_info:
            return "Bank transaction"
        if isinstance(remittance_info, list):
            return " ".join(str(info) for info in remittance_info if info)[:200]

        return str(remittance_info)[:200]

    async def fetch_transactions_for_account(self,
        account_id: str,
        date_from: datetime,
        date_to: datetime
    ) -> List[Transaction]:
        response = await enable_banking_service.get_transaction(account_id, date_from, date_to)
        return response.transactions

    def convert_transactions_to_expense_format(self,
        transactions: List[Transaction],
        account_id: str,
    ) -> List[Dict[str, Any]]:

        expenses = []

        for transaction in transactions:
            transaction_amount = transaction.transaction_amount.amount
            if transaction.credit_debit_indicator != "DBIT" and transaction.status != "BOOK":
                continue

            expense_data = {
                'amount': transaction_amount,
                'currency': transaction.transaction_amount.currency,
                'expense_date': transaction.value_date.isoformat(),
                'description':  self._extract_description(transaction.remittance_information),
                'payment_method': 'card',
                'vendor': 'test',
                'unique_id': f"{account_id}_{transaction_amount}_{transaction.value_date}",
                'tags': ["bank_import", "auto_sync"]
            }
            expenses.append(expense_data)
        return expenses

    async def import_transactions_as_expenses(self,
        user_id: str,
        account_id: str,
        date_from: datetime,
        date_to:datetime
    ):

        # Fetch all transacations
        transactions = await self.fetch_transactions_for_account(account_id, date_from, date_to)

        # Convert to expense format
        expense_data_list = self.convert_transactions_to_expense_format(transactions, account_id)

        # Check duplicates and get suggestions
        expense_data_list = self.expense_import_service.check_duplicates(user_id, expense_data_list)
        expense_data_list = self.expense_import_service.get_categorization_suggestions(user_id, expense_data_list)

        # Import Expense

        imported_count = 0

        for expense_data in expense_data_list:
            if expense_data.get('is_duplicate', False):
                continue

            expense_create = ExpenseCreate(
                amount=Decimal(str(expense_data['amount'])),
                currency=expense_data['currency'],
                description=expense_data['description'],
                expense_date=datetime.fromisoformat(expense_data['expense_date']).date(),
                payment_method=expense_data['payment_method'],
                vendor=expense_data.get('vendor'),
                category_id=expense_data.get('suggested_category_id'),
                subcategory_id=expense_data.get('suggested_subcategory_id'),
                tags=expense_data.get('tags', [])
            )

            expense = expense_crud.create_for_user(self.db, obj_in=expense_create, user_id=user_id)
            imported_count += 1

        return {
            'success': True,
            'message': f'Successfully imported {imported_count} expenses',
            'imported_count': imported_count,
            'total_found': len(transactions),
            'total_expenses': len(expense_data_list)
        }
