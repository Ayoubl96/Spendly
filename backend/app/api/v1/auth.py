from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash
from app.models.user import User
from app.schemas.auth import Token, TokenData, Register
from app.schemas.user import User as UserSchema, UserCreate

router = APIRouter()


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user by email and password."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict):
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: Register,
    db: Session = Depends(get_db)
):
    """
    Register a new user.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    db_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        is_active=True,
        is_superuser=False
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create default categories for the new user
    from app.models.category import Category, CategoryType
    default_categories = [
        # Income categories
        {"name": "Salary", "type": CategoryType.INCOME, "color": "#4CAF50", "icon": "💰"},
        {"name": "Freelance", "type": CategoryType.INCOME, "color": "#8BC34A", "icon": "💻"},
        {"name": "Investment Returns", "type": CategoryType.INCOME, "color": "#CDDC39", "icon": "📈"},
        {"name": "Other Income", "type": CategoryType.INCOME, "color": "#FFC107", "icon": "💵"},
        
        # Expense categories
        {"name": "Food & Dining", "type": CategoryType.EXPENSE, "color": "#F44336", "icon": "🍔"},
        {"name": "Transportation", "type": CategoryType.EXPENSE, "color": "#E91E63", "icon": "🚗"},
        {"name": "Shopping", "type": CategoryType.EXPENSE, "color": "#9C27B0", "icon": "🛍️"},
        {"name": "Entertainment", "type": CategoryType.EXPENSE, "color": "#673AB7", "icon": "🎮"},
        {"name": "Bills & Utilities", "type": CategoryType.EXPENSE, "color": "#3F51B5", "icon": "📱"},
        {"name": "Healthcare", "type": CategoryType.EXPENSE, "color": "#2196F3", "icon": "🏥"},
        {"name": "Education", "type": CategoryType.EXPENSE, "color": "#03A9F4", "icon": "📚"},
        {"name": "Home", "type": CategoryType.EXPENSE, "color": "#00BCD4", "icon": "🏠"},
        {"name": "Personal Care", "type": CategoryType.EXPENSE, "color": "#009688", "icon": "💅"},
        {"name": "Gifts & Donations", "type": CategoryType.EXPENSE, "color": "#4CAF50", "icon": "🎁"},
        {"name": "Other Expenses", "type": CategoryType.EXPENSE, "color": "#FF9800", "icon": "📌"},
    ]
    
    for cat_data in default_categories:
        category = Category(user_id=db_user.id, **cat_data)
        db.add(category)
    
    db.commit()
    
    return db_user


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    """
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout():
    """
    Logout user (client should remove tokens).
    """
    return {"message": "Successfully logged out"}