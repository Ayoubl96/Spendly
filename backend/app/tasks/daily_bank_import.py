import logging
from datetime import datetime, timedelta
from typing import Dict, List
from celery import current_task
from sqlalchemy.orm import Session
import asyncio
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.db.models.enable_banking import BankConnection, TransactionImportLog
from app.services.bank_transaction_import_service import BankTransactionImportService
from app.services.telegram_service import telegram_service


logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="app.tasks.daily_bank_import.process_daily_bank_imports")
def process_daily_bank_imports(self):
    task_id = self.request.id
    logger.info(f"Starting daily bank import task {task_id}")

    # Get Yesterday's date for import
    yesterday = datetime.utcnow().date() - timedelta(days=1)
    date_from = datetime.combine(yesterday, datetime.min.time())
    date_to = datetime.combine(yesterday, datetime.max.time())

    db: Session = SessionLocal()

    try:

        connections = db.query(BankConnection).filter(
            BankConnection.sync_enabled == True,
            BankConnection.status =="AUTHORIZED",
            BankConnection.telegram_notification == True,
        ).all()

        print(f"this is {connections}")

        logger.info(f"Found {len(connections)} bank connections active")

        if not connections:
            logger.info("No bank connections found")
            return {
                "status": "completed",
                "message": "No connections processed"
            }

        successful_imports = []
        failed_imports = []

        # Process each connection
        #
        for connection in connections:
            try:
                result = asyncio.run(process_single_bank_connection(
                    db, connection, date_from, date_to
                ))
                if result["success"]:
                    successful_imports.append(
                        {
                            "bank_name": connection.bank_name,
                            "iban": connection.bank_code if connection else "Unknown",
                            "transaction_count": result.get("imported_count", 0),
                            "user_id": str(connection.user_id),
                            "chat_id": connection.telegram_chat_id
                        }
                    )
                else:
                    failed_imports.append(
                        {
                            "bank_name": connection.bank_name,
                            "iban": connection.bank_code if connection else "Unknown",
                            "error": result["error"],
                            "user_id": str(connection.user_id),
                            "chat_id": connection.telegram_chat_id
                        }
                    )
            except Exception as e:
                logger.info(f"error processing connection {connection.id}: {e}")
                failed_imports.append(
                    {
                        "bank_name": connection.bank_name,
                        "iban": connection.bank_code if connection else "Unknown",
                        "error": str(e),
                        "user_id": str(connection.user_id),
                        "chat_id": connection.telegram_chat_id
                    }
                )

        # Send telegram notifications grouped by user
        asyncio.run(send_telegram_notifications(
            successful_imports,
            failed_imports,
            yesterday.strftime("%Y-%m-%d")
        ))

        current_task.update_state(
            state='SUCCESS',
            meta={
                'sucessful_imports': len(successful_imports),
                'failed_imports': len(failed_imports),
                'total_processed': len(connections)
            }
        )

        logger.info(f"Daily import task completed. Success: {len(successful_imports)}, Failed: {len(failed_imports)}")
        return {
            "status": "completed",
            "successful_imports": len(successful_imports),
            "failed_imports": len(failed_imports),
            "total_processed": len(connections)
        }
    except Exception as e:
        logger.error(f"Fatal error in daily import task: {e}")
        current_task.update_state(
            state='FAILURE',
            meta={'error': str(e)}
        )
        raise
    finally:
         db.close()

async def process_single_bank_connection(
    db: Session,
    connection: BankConnection,
    date_from: datetime,
    date_to: datetime
)-> Dict:

    # Process a single bank connection and impor transactions
    logger.info(f"Processing bank connection: {connection.bank_name} for user {connection.user_id}")

    # Credate import log
    import_log = TransactionImportLog(
        connection_id = connection.id,
        user_id = connection.user_id,
        started_at = datetime.utcnow(),
        status="running"
    )
    db.add(import_log)
    db.commit()

    try:
        if connection.is_token_expired():
            error_msg = "Bank token expired - please reconnect"
            logger.warning(f"Token expired for connection {connection.id}")

            # update import log
            import_log.status = "failed"
            import_log.error_message = error_msg
            import_log.completed_at = datetime.utcnow()

            #update connection error tracking
            connection.last_error = error_msg
            connection.error_count += 1

            db.commit()

            return {"success": False, "error": error_msg}

        accounts = connection
        print(f"this is {accounts}")
        if not accounts:
            error_msg = "No accounts found for this connection"
            logger.warning(f"No accounts for connection {connection.id}")

            import_log.status = "failed"
            import_log.error_message = error_msg
            import_log.completed_at = datetime.utcnow()
            db.commit()

            return {"success": False, "error": error_msg}

        # Initialize import service
        import_service = BankTransactionImportService(db)
        total_imported = 0
        total_fetched = 0

        if not connection.sync_enabled:
            pass

        try:
            result = await import_service.import_transactions_as_expenses(
                user_id=str(connection.user_id),
                account_id=connection.account_uid,
                date_from=date_from,
                date_to=date_to
            )
            if result.get("success"):
                total_imported += result.get("imported_count", 0)
                total_fetched += result.get("total_found", 0)

                connection.last_sync_at = datetime.utcnow()
                connection.next_sync_at = datetime.utcnow() + timedelta(days=1)
        except Exception as e:
            logger.error(f"Error importing from account {connection.id}: {e}")

        # Update import log with success
        import_log.status = "completed"
        import_log.completed_at = datetime.utcnow()
        import_log.transaction_fetched = total_fetched
        import_log.transaction_imported = total_imported

        # Update connection sync info
        connection.last_sync_at = datetime.utcnow()
        connection.error_count = 0
        connection.last_error = None

        db.commit()

        logger.info(f"Successfully imported {total_imported} transaction for connection {connection.id}")

        return {
            "success": True,
            "imported_count": total_imported,
            "fetched_count": total_fetched
        }

    except Exception as e:
        logger.error(f"Error processing connection {connection.id}: {e}")
          # Update import log with failure
        import_log.status = "failed"
        import_log.error_message = str(e)
        import_log.completed_at = datetime.utcnow()

          # Update connection error tracking
        connection.last_error = str(e)
        connection.error_count += 1

        db.commit()

          # Check if this looks like a 429 or token error
        error_str = str(e).lower()
        if "429" in error_str or "rate limit" in error_str:
              error_msg = "Rate limit exceeded - will retry tomorrow"
        elif "401" in error_str or "unauthorized" in error_str:
              error_msg = "Bank token expired - please reconnect"
        elif "403" in error_str or "forbidden" in error_str:
              error_msg = "Access forbidden - please check bank permissions"
        else:
              error_msg = f"Import failed: {str(e)}"

        return {"success": False, "error": error_msg}

async def send_telegram_notifications(
    successful_imports: List[Dict],
    failed_imports: List[Dict],
    import_date: str
):

    user_groups = {}
    print(f"import data {import_date} - {successful_imports} -- {failed_imports}")

    for import_data in successful_imports:
        chat_id = import_data["chat_id"]
        if chat_id not in user_groups:
            user_groups[chat_id] = {"successful": [], "failed": []}
        user_groups[chat_id]["successful"].append(import_data)

    for import_data in failed_imports:
        chat_id = import_data["chat_id"]
        if chat_id not in user_groups:
            user_groups[chat_id] = {"successful": [], "failed": []}
        user_groups[chat_id]["failed"].append(import_data)

    for chat_id, data in user_groups.items():
        try:
            await telegram_service.send_daily_import_summary(
                chat_id = chat_id,
                successful_imports=data["successful"],
                failed_imports=data["failed"],
                import_date=import_date
            )
        except Exception as e:
            logger.error(f"Failed to send telegram notification to {chat_id}: {e}")

@celery_app.task(name="app.tasks.daily_bank_import.test_telegram_notification")
def test_telegram_notification(
    chat_id: str,
    message: str = "Test notification from Spendly"
):
    try:
        result = telegram_service.send_message(chat_id, message)
        return {"success": result, "message": "Test notification sent"}

    except Exception as e:
        logger.error(f"Failed to send test notification: {e}")
        return {"success": False, "error": str(e)}
