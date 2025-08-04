"""
CRUD operations for User model
"""

from typing import Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.db.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """CRUD operations for User"""
    
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()
    
    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        """Create a new user with hashed password"""
        db_obj = User(
            email=obj_in.email,
            password_hash=get_password_hash(obj_in.password),
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            default_currency=obj_in.default_currency,
            timezone=obj_in.timezone,
            date_format=obj_in.date_format,
            language=obj_in.language
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def authenticate(self, db: Session, *, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user
    
    def is_active(self, user: User) -> bool:
        """Check if user is active"""
        return user.is_active
    
    def is_email_verified(self, user: User) -> bool:
        """Check if user's email is verified"""
        return user.email_verified
    
    def update_password(self, db: Session, *, user: User, new_password: str) -> User:
        """Update user's password"""
        user.password_hash = get_password_hash(new_password)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    def verify_email(self, db: Session, *, user: User) -> User:
        """Mark user's email as verified"""
        user.email_verified = True
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    def deactivate(self, db: Session, *, user: User) -> User:
        """Deactivate user account"""
        user.is_active = False
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    def activate(self, db: Session, *, user: User) -> User:
        """Activate user account"""
        user.is_active = True
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


# Create instance
user_crud = CRUDUser(User)