import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.core.database import SessionLocal
from app.db.models.enable_banking import BankConnection

def test_db():
    db = SessionLocal()
    try:
        connections = db.query(BankConnection).all()
        print(f"Found {len(connections)} bank connections")
        for conn in connections:
            print(f"- {conn.bank_name}: sync_enabled={conn.sync_enabled}, "
                    f"telegram_notification={conn.telegram_notification}, "
                    f"chat_id={conn.telegram_chat_id}")
    finally:
        db.close()

if __name__ == "__main__":
      test_db()
