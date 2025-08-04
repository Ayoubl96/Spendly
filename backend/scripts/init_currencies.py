#!/usr/bin/env python3
"""
Initialize basic currencies in the database
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.db.models.currency import Currency

def init_currencies():
    """Initialize basic currencies"""
    
    currencies_data = [
        {"code": "USD", "name": "US Dollar", "symbol": "$", "decimal_places": 2},
        {"code": "EUR", "name": "Euro", "symbol": "€", "decimal_places": 2},
        {"code": "MAD", "name": "Moroccan Dirham", "symbol": "MAD", "decimal_places": 2},
        {"code": "BTC", "name": "Bitcoin", "symbol": "₿", "decimal_places": 8},
    ]
    
    db: Session = SessionLocal()
    
    try:
        print("Initializing currencies...")
        
        for currency_data in currencies_data:
            # Check if currency already exists
            existing = db.query(Currency).filter(Currency.code == currency_data["code"]).first()
            
            if not existing:
                currency = Currency(**currency_data)
                db.add(currency)
                print(f"Added currency: {currency_data['code']} - {currency_data['name']}")
            else:
                print(f"Currency {currency_data['code']} already exists, skipping...")
        
        db.commit()
        print(f"\nCurrency initialization completed! Added {len(currencies_data)} currencies.")
        
    except Exception as e:
        print(f"Error initializing currencies: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_currencies()