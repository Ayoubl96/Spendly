import logging
from datetime import datetime, timedelta
from typing import Dict, List
from celery import current_task
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models.enable_banking import BankConnection, BankConnectionStatus, TransactionImportLog
from app.services.bank_transaction_import_service import BankTransactionImportService
from app.services.telegram_service import telegra_service


logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="app.tasks.daily_bank_import.process_daily_bank_imports")
def process_daily_bank_import(self):
    task_id = self.request.id
    logger.info(f"Starting daily bank import task {task_id}")

    # Get Yesterday's date for import
    yesterday = datetime.utcnow().date - timedelta(days=1)
    date_from = datetime.combine(yesterday, datetime.min.time())
    date_to = datetime.combine(yesterday, datetime.max.time())

    db: Session = SessionLocal()

    try:

        connections = db.query(BankConnection).filter(
            BankConnection.sync_enabled == True,
            BankConnection.status =="AUTHORIZED",
            BankConnection.telegram_notification == True,
        ).all()

        logger.info(f"Found {len(connections)} bank connections active")

        if not connections:
            logger.info("No bank connections found")
            return {
                "status": "completed",
                "message": "No connections processed"
            }

        successful_import = []
        failed_import []

        # Process each connection
        #
        for connection in conncetions:
            try:
                result = await process_single_bank_connection(
                    db, connection, date_from, date_to
                )
