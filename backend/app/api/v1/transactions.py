from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, extract
from typing import List, Optional
from datetime import date, datetime
import pandas as pd
import io
from uuid import UUID

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.transaction import Transaction, TransactionType
from app.models.category import Category
from app.schemas.transaction import (
    Transaction as TransactionSchema,
    TransactionCreate,
    TransactionUpdate,
    TransactionWithCategory,
    TransactionImport,
    TransactionImportResult,
    TransactionSummary
)

router = APIRouter()


@router.get("/import/template")
async def download_import_template():
    """
    Download a sample CSV template for importing transactions.
    """
    import os
    template_path = os.path.join(os.path.dirname(__file__), "..", "..", "static", "transaction_template.csv")
    
    if not os.path.exists(template_path):
        # Create template on the fly if it doesn't exist
        template_content = """date,amount,description,category,type,tags
2024-01-15,1500.00,Grocery shopping at Walmart,Food & Dining,expense,"groceries,monthly"
2024-01-16,85.50,Gas for car,Transportation,expense,"fuel,car"
2024-01-20,3500.00,Monthly salary,Salary,income,"salary,monthly"
2024-01-22,120.00,Dinner with friends,Food & Dining,expense,"restaurant,social"
2024-01-25,50.00,Netflix subscription,Entertainment,expense,"subscription,monthly"
"""
        os.makedirs(os.path.dirname(template_path), exist_ok=True)
        with open(template_path, 'w') as f:
            f.write(template_content)
    
    return FileResponse(
        path=template_path,
        filename="transaction_import_template.csv",
        media_type="text/csv"
    )


@router.get("/", response_model=List[TransactionWithCategory])
async def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_id: Optional[UUID] = None,
    transaction_type: Optional[TransactionType] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List user transactions with pagination and filters.
    """
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    # Apply filters
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if transaction_type:
        query = query.filter(Transaction.type == transaction_type)
    if search:
        query = query.filter(
            or_(
                Transaction.description.ilike(f"%{search}%"),
                Transaction.tags.ilike(f"%{search}%")
            )
        )
    
    # Order by date descending
    transactions = query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    
    return transactions


@router.get("/summary", response_model=TransactionSummary)
async def get_transaction_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get transaction summary for the specified period.
    """
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    # Calculate totals
    income_sum = query.filter(Transaction.type == TransactionType.INCOME).with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar()
    
    expense_sum = query.filter(Transaction.type == TransactionType.EXPENSE).with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar()
    
    transaction_count = query.count()
    
    return TransactionSummary(
        total_income=income_sum,
        total_expenses=expense_sum,
        net_amount=income_sum - expense_sum,
        transaction_count=transaction_count,
        average_transaction=(income_sum + expense_sum) / transaction_count if transaction_count > 0 else 0
    )


@router.get("/{transaction_id}", response_model=TransactionWithCategory)
async def get_transaction(
    transaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get a specific transaction by ID.
    """
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return transaction


@router.post("/", response_model=TransactionSchema, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Create a new transaction.
    """
    # Verify category belongs to user if provided
    if transaction_data.category_id:
        category = db.query(Category).filter(
            Category.id == transaction_data.category_id,
            Category.user_id == current_user.id
        ).first()
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Verify category type matches transaction type
        if category.type.value != transaction_data.type.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category type '{category.type.value}' does not match transaction type '{transaction_data.type.value}'"
            )
    
    # Create transaction
    db_transaction = Transaction(
        **transaction_data.dict(),
        user_id=current_user.id
    )
    
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    return db_transaction


@router.put("/{transaction_id}", response_model=TransactionSchema)
async def update_transaction(
    transaction_id: UUID,
    transaction_update: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Update a transaction.
    """
    # Get existing transaction
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Verify category if being updated
    if transaction_update.category_id is not None:
        if transaction_update.category_id:  # Not null
            category = db.query(Category).filter(
                Category.id == transaction_update.category_id,
                Category.user_id == current_user.id
            ).first()
            
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Category not found"
                )
            
            # Check type compatibility
            transaction_type = transaction_update.type or transaction.type
            if category.type.value != transaction_type.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Category type '{category.type.value}' does not match transaction type '{transaction_type.value}'"
                )
    
    # Update transaction
    update_data = transaction_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)
    
    transaction.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(transaction)
    
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Delete a transaction.
    """
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    db.delete(transaction)
    db.commit()


@router.post("/import", response_model=TransactionImportResult)
async def import_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Import transactions from CSV or Excel file.
    
    Expected columns:
    - date: Transaction date (YYYY-MM-DD)
    - amount: Transaction amount
    - description: Transaction description (optional)
    - category: Category name (optional)
    - type: income or expense
    - tags: Comma-separated tags (optional)
    """
    # Validate file type
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only CSV and Excel files are supported."
        )
    
    # Read file
    try:
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}"
        )
    
    # Validate required columns
    required_columns = ['date', 'amount', 'type']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns: {', '.join(missing_columns)}"
        )
    
    # Get user's categories
    user_categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    category_map = {cat.name.lower(): cat for cat in user_categories}
    
    # Process transactions
    successful_imports = 0
    failed_imports = 0
    errors = []
    imported_transactions = []
    
    for index, row in df.iterrows():
        try:
            # Parse data
            transaction_date = pd.to_datetime(row['date']).date()
            amount = float(row['amount'])
            transaction_type = TransactionType(row['type'].lower())
            description = row.get('description', '')
            tags = row.get('tags', '')
            
            # Find category
            category_id = None
            if 'category' in row and pd.notna(row['category']):
                category_name = str(row['category']).lower()
                if category_name in category_map:
                    category = category_map[category_name]
                    if category.type.value == transaction_type.value:
                        category_id = category.id
            
            # Create transaction
            transaction = Transaction(
                user_id=current_user.id,
                date=transaction_date,
                amount=amount,
                type=transaction_type,
                description=str(description) if pd.notna(description) else None,
                category_id=category_id,
                tags=str(tags) if pd.notna(tags) else None,
                currency=current_user.currency if hasattr(current_user, 'currency') else 'USD'
            )
            
            db.add(transaction)
            imported_transactions.append(transaction)
            successful_imports += 1
            
        except Exception as e:
            failed_imports += 1
            errors.append(f"Row {index + 2}: {str(e)}")
    
    # Commit all transactions
    if successful_imports > 0:
        db.commit()
        for transaction in imported_transactions:
            db.refresh(transaction)
    
    return TransactionImportResult(
        total_rows=len(df),
        successful_imports=successful_imports,
        failed_imports=failed_imports,
        errors=errors,
        transactions=[TransactionSchema.from_orm(t) for t in imported_transactions]
    )