import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.telegram_service import telegram_service


async def test_bot():
    print(f"test starting")

    if telegram_service.bot:
        try:
            bot_info = await telegram_service.bot.get_me()
            print(f"Bot connected: @{bot_info.username}")
            print(f"Bot name: {bot_info.first_name}")
            print(f"Bot ID: {bot_info.id}")

        except Exception as e:
            print(f"error {e}")
        updates = await telegram_service.bot.get_updates()
        if updates:
            chat_id = updates[-1].message.chat.id
            print(f"your chat ID: {chat_id}")

            result = await telegram_service.send_message(str(chat_id), "La vic puzza tantissimo")
            print(f"message sent: {result}")
            # Test the daily import summary format
            print("\n=== Testing Daily Import Summary ===")

            # Mock data to test the summary format
            successful_imports = [
                {
                    "bank_name": "Chase Bank",
                    "iban": "US12345678901234567890",
                    "transaction_count": 15
                },
                {
                    "bank_name": "Wells Fargo",
                    "iban": "US09876543210987654321",
                    "transaction_count": 8
                }
            ]

            failed_imports = [
                {
                    "bank_name": "BankOfAmerica",
                    "iban": "US11111111111111111111",
                    "error": "Token expired - please reconnect"
                }
            ]

            result_summary = await telegram_service.send_daily_import_summary(
                chat_id=str(chat_id),
                successful_imports=successful_imports,
                failed_imports=failed_imports,
                import_date="2024-01-15"
            )
            print(f"Daily summary sent: {result_summary}")
    else:
        print("bot not working")



if __name__ == "__main__":
    asyncio.run(test_bot())
