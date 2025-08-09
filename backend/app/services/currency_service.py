"""
Currency conversion service with live exchange rates
"""

try:
    import httpx  # Preferred async HTTP client
except Exception:  # ModuleNotFoundError or any import-time failure
    httpx = None
import logging
import json
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.db.models.currency import Currency, ExchangeRate
from app.crud.crud_currency import exchange_rate_crud
from app.core.config import settings

logger = logging.getLogger(__name__)

class CurrencyConversionService:
    """Service for handling currency conversions with live rates"""
    
    def __init__(self, db: Session):
        self.db = db
        
        # Load configuration from environment variables
        self.api_base_url = settings.CURRENCY_API_BASE_URL
        self.api_key = settings.CURRENCY_API_KEY
        self.api_timeout = settings.CURRENCY_API_TIMEOUT
        self.cache_duration_hours = settings.CURRENCY_CACHE_DURATION_HOURS
        
        # Parse fallback rates from JSON string
        try:
            fallback_data = json.loads(settings.CURRENCY_FALLBACK_RATES)
            self.fallback_rates = {}
            for base_currency, rates in fallback_data.items():
                self.fallback_rates[base_currency] = {
                    currency: Decimal(str(rate)) 
                    for currency, rate in rates.items()
                }
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse fallback rates: {e}")
            # Default fallback rates
            self.fallback_rates = {
                "USD": {
                    "EUR": Decimal("0.85"),
                    "MAD": Decimal("10.0"),
                    "BTC": Decimal("0.000025")
                }
            }
    
    async def get_exchange_rate(
        self, 
        from_currency: str, 
        to_currency: str,
        force_refresh: bool = False
    ) -> Optional[Decimal]:
        """
        Get exchange rate between two currencies.
        First checks cached rates, then fetches from API if needed.
        """
        if from_currency == to_currency:
            return Decimal("1.0")
        
        # Check for cached rate first (unless force refresh)
        if not force_refresh:
            cached_rate = self._get_cached_rate(from_currency, to_currency)
            if cached_rate:
                return cached_rate
        
        # Fetch from API
        try:
            rate = await self._fetch_rate_from_api(from_currency, to_currency)
            if rate:
                # Cache the rate
                self._cache_rate(from_currency, to_currency, rate)
                return rate
        except Exception as e:
            logger.error(f"Failed to fetch exchange rate {from_currency}/{to_currency}: {e}")
            
            # Fallback to cached rate even if expired
            cached_rate = self._get_cached_rate(from_currency, to_currency, ignore_expiry=True)
            if cached_rate:
                logger.warning(f"Using expired cached rate for {from_currency}/{to_currency}")
                return cached_rate
        
        return None
    
    async def convert_amount(
        self,
        amount: Decimal,
        from_currency: str,
        to_currency: str,
        force_refresh: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Convert amount from one currency to another.
        Returns dict with converted amount and exchange rate.
        """
        rate = await self.get_exchange_rate(from_currency, to_currency, force_refresh)
        if rate is None:
            return None
        
        # Convert amount (round to 2 decimal places)
        converted_amount = (amount * rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        return {
            "original_amount": amount,
            "original_currency": from_currency,
            "converted_amount": converted_amount,
            "target_currency": to_currency,
            "exchange_rate": rate,
            "conversion_date": datetime.utcnow().isoformat()
        }
    
    async def _fetch_rate_from_api(self, from_currency: str, to_currency: str) -> Optional[Decimal]:
        """Fetch exchange rate from external API with fallback"""
        # Try primary API first
        rate = await self._try_fastforex_api(from_currency, to_currency)
        if rate:
            return rate
            
        logger.warning(f"Primary API failed for {from_currency}/{to_currency}, trying fallback...")
        
        # Try fallback rates
        fallback_rate = self._get_fallback_rate(from_currency, to_currency)
        if fallback_rate:
            logger.info(f"Using fallback rate for {from_currency}/{to_currency}: {fallback_rate}")
            return fallback_rate
            
        return None
    
    async def _try_fastforex_api(self, from_currency: str, to_currency: str) -> Optional[Decimal]:
        """Try to fetch rate from FastFOREX API (prefers httpx; falls back to requests if unavailable)."""
        # Prefer httpx when available
        if httpx is not None:
            try:
                async with httpx.AsyncClient(timeout=self.api_timeout) as client:
                    params = {
                        "from": from_currency,
                        "to": to_currency,
                        "api_key": self.api_key or "demo"
                    }
                    response = await client.get(self.api_base_url, params=params)
                    response.raise_for_status()
                    data = response.json()
                    if "result" in data and to_currency in data["result"]:
                        rate_value = data["result"][to_currency]
                        return Decimal(str(rate_value))
            except Exception as e:
                logger.error(f"FastFOREX API request failed for {from_currency}/{to_currency}: {e}")
                # fall through to requests fallback

        # Fallback to requests if httpx not available or failed
        try:
            import requests  # Lazy import to avoid mandatory dependency at startup
            params = {
                "from": from_currency,
                "to": to_currency,
                "api_key": self.api_key or "demo"
            }
            resp = requests.get(self.api_base_url, params=params, timeout=float(self.api_timeout))
            resp.raise_for_status()
            data = resp.json()
            if "result" in data and to_currency in data["result"]:
                rate_value = data["result"][to_currency]
                return Decimal(str(rate_value))
        except Exception as e:
            logger.error(f"Fallback requests API call failed for {from_currency}/{to_currency}: {e}")

        return None
    
    def _get_fallback_rate(self, from_currency: str, to_currency: str) -> Optional[Decimal]:
        """Get fallback exchange rate from predefined rates"""
        try:
            # Direct rate from USD base rates
            if from_currency == "USD" and to_currency in self.fallback_rates["USD"]:
                return self.fallback_rates["USD"][to_currency]
            
            # Reverse rate (to USD)
            if to_currency == "USD" and from_currency in self.fallback_rates["USD"]:
                original_rate = self.fallback_rates["USD"][from_currency]
                return Decimal("1.0") / original_rate
            
            # Cross-currency conversion via USD
            if from_currency in self.fallback_rates["USD"] and to_currency in self.fallback_rates["USD"]:
                from_usd_rate = self.fallback_rates["USD"][from_currency]
                to_usd_rate = self.fallback_rates["USD"][to_currency]
                # Convert: from_currency -> USD -> to_currency
                usd_rate = Decimal("1.0") / from_usd_rate
                final_rate = usd_rate * to_usd_rate
                return final_rate
                
        except Exception as e:
            logger.error(f"Fallback rate calculation failed for {from_currency}/{to_currency}: {e}")
        
        return None
    
    def _get_cached_rate(
        self, 
        from_currency: str, 
        to_currency: str,
        ignore_expiry: bool = False
    ) -> Optional[Decimal]:
        """Get cached exchange rate from database"""
        try:
            # Query for the most recent rate
            rate_record = (
                self.db.query(ExchangeRate)
                .filter(
                    ExchangeRate.from_currency == from_currency,
                    ExchangeRate.to_currency == to_currency
                )
                .order_by(ExchangeRate.rate_date.desc())
                .first()
            )
            
            if not rate_record:
                return None
            
            # Check if rate is still fresh (unless ignoring expiry)
            if not ignore_expiry:
                age = datetime.utcnow() - rate_record.rate_date
                if age > timedelta(hours=self.cache_duration_hours):
                    return None
            
            return Decimal(rate_record.rate)
            
        except Exception as e:
            logger.error(f"Failed to get cached rate {from_currency}/{to_currency}: {e}")
            return None
    
    def _cache_rate(self, from_currency: str, to_currency: str, rate: Decimal) -> None:
        """Cache exchange rate in database"""
        try:
            rate_record = ExchangeRate(
                from_currency=from_currency,
                to_currency=to_currency,
                rate=str(rate),
                rate_date=datetime.utcnow(),
                source="api"
            )
            self.db.add(rate_record)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to cache rate {from_currency}/{to_currency}: {e}")
            self.db.rollback()
    
    def get_supported_currencies(self) -> list[Currency]:
        """Get list of supported currencies from database"""
        return (
            self.db.query(Currency)
            .filter(Currency.is_active == True)
            .order_by(Currency.code)
            .all()
        )