import logging
from typing import Dict, List, Optional
from telegram import Bot
from telegram.error import TelegramError
from app.core.config import settings

logger = logging.getLogger(__name__)

class TelegramService:
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.bot: Optional[Bot] = None

        if self.bot_token and self.bot_token != "token":
            try:
                self.bot = Bot(token=self.bot_token)
                logger.info("Telegram bot initialized successfully")

            except Exception as e:
                logger.error(f"Failed to initialize telegram bot: {e}")
                self.bot = None

        else:
            logger.warning("Telegram bot token not configured")


    async def send_message(self, chat_id: str, message: str) -> bool:
        if not self.bot:
            logger.error("Telegram bot not initialized")

        try:
            await self.bot.send_message(
                chat_id=chat_id,
                text=message,
                parse_mode='HTML'
            )
            logger.info(f"Message sent successfully to chat_id: {chat_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to send telegram message to {chat_id}, {e}")
            return False

    async def send_daily_import_summary(
        self,
        chat_id: str,
        successful_imports: List[Dict],
        failed_imports: List[Dict],
        import_date: str
    ) -> bool:

        success_text = ""
        total_transactions = 0

        if successful_imports:
            success_text = "✅ <b>Successful Imports:</b>\n"
            for import_data in successful_imports:
                bank_name = import_data.get('bank_name', 'Unknown')
                iban = import_data.get('iban', 'Unknown')
                count = import_data.get('transaction_count', 0)
                total_transactions += count

                # Mask Iban
                masked_iban = f"****{iban[-4:]}" if len(iban) >= 4 else iban
                success_text += f"• {bank_name} (IBAN: {masked_iban}): {count} transactions imported\n"
                failure_text = ""

        if failed_imports:
            failure_text = "\n❌ <b>Failed Imports:</b>\n"
            for import_data in failed_imports:
                bank_name = import_data.get('bank_name', 'Unknown Bank')
                iban = import_data.get('iban', 'Unknown')
                error = import_data.get('error', 'Unknown error')

                masked_iban = f"****{iban[-4:]}" if len(iban) >= 4 else iban
                failure_text += f"• {bank_name} (IBAN: {masked_iban}): {error}\n"

        # Build complete message
        if not successful_imports and not failed_imports:
            message = f"🏦 <b>Daily Bank Import Summary - {import_date}</b>\n\n"
            message += "ℹ️ No bank connections were processed today."
        else:
            message = f"🏦 <b>Daily Bank Import Summary - {import_date}</b>\n\n"
            message += success_text + failure_text

            if total_transactions > 0:
                message += f"\n📊 <b>Total: {total_transactions} transactions imported</b>"

        return await self.send_message(chat_id, message)

    async def send_import_error_notification(
        self,
        chat_id: str,
        bank_name: str,
        error_message: str
    ) -> bool:

          message = f"⚠️ <b>Bank Import Error</b>\n\n"
          message += f"Bank: {bank_name}\n"
          message += f"Error: {error_message}\n\n"
          message += "Please check your bank connection settings."

          return await self.send_message(chat_id, message)

    async def get_bot_info(self) -> Optional[Dict]:
        if not self.bot:
            return None

        try:
            bot_info = await self.bot.get_met()
            return {
                "id": bot_info.id,
                "username": bot_info.usernae,
                "first_name": bot_info.first_name,
            }
        except TelegramError as e:
            logger.error(f"Failed to get bot info: {e}")
            return None

telegram_service = TelegramService()
