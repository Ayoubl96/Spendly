"""
CRUD operations for Currency model
"""

from typing import List, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.db.models.currency import Currency, ExchangeRate
from app.schemas.currency import CurrencyCreate, CurrencyUpdate


class CRUDCurrency(CRUDBase[Currency, CurrencyCreate, CurrencyUpdate]):
    """CRUD operations for Currency"""
    
    def get_by_code(self, db: Session, *, code: str) -> Optional[Currency]:
        """Get currency by code"""
        return db.query(Currency).filter(Currency.code == code).first()
    
    def get_active(self, db: Session) -> List[Currency]:
        """Get all active currencies"""
        return db.query(Currency).filter(Currency.is_active == True).all()
    
    def create(self, db: Session, *, obj_in: CurrencyCreate) -> Currency:
        """Create a new currency"""
        db_obj = Currency(
            code=obj_in.code,
            name=obj_in.name,
            symbol=obj_in.symbol,
            decimal_places=obj_in.decimal_places,
            is_active=obj_in.is_active
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def deactivate(self, db: Session, *, code: str) -> Optional[Currency]:
        """Deactivate a currency"""
        currency = self.get_by_code(db, code=code)
        if currency:
            currency.is_active = False
            db.add(currency)
            db.commit()
            db.refresh(currency)
        return currency
    
    def activate(self, db: Session, *, code: str) -> Optional[Currency]:
        """Activate a currency"""
        currency = self.get_by_code(db, code=code)
        if currency:
            currency.is_active = True
            db.add(currency)
            db.commit()
            db.refresh(currency)
        return currency


class CRUDExchangeRate(CRUDBase[ExchangeRate, dict, dict]):
    """CRUD operations for ExchangeRate"""
    
    def get_latest_rate(
        self, 
        db: Session, 
        *, 
        from_currency: str, 
        to_currency: str
    ) -> Optional[ExchangeRate]:
        """Get the latest exchange rate between two currencies"""
        return (
            db.query(ExchangeRate)
            .filter(
                ExchangeRate.from_currency == from_currency,
                ExchangeRate.to_currency == to_currency
            )
            .order_by(ExchangeRate.rate_date.desc())
            .first()
        )
    
    def create_rate(
        self,
        db: Session,
        *,
        from_currency: str,
        to_currency: str,
        rate: str,
        rate_date: str,
        source: str = "manual"
    ) -> ExchangeRate:
        """Create a new exchange rate"""
        db_obj = ExchangeRate(
            from_currency=from_currency,
            to_currency=to_currency,
            rate=rate,
            rate_date=rate_date,
            source=source
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_rates_for_currency(
        self, 
        db: Session, 
        *, 
        currency: str
    ) -> List[ExchangeRate]:
        """Get all exchange rates for a specific currency"""
        return (
            db.query(ExchangeRate)
            .filter(
                (ExchangeRate.from_currency == currency) | 
                (ExchangeRate.to_currency == currency)
            )
            .order_by(ExchangeRate.rate_date.desc())
            .all()
        )


# Create instances
currency_crud = CRUDCurrency(Currency)
exchange_rate_crud = CRUDExchangeRate(ExchangeRate)