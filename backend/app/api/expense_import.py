"""
API endpoints for expense import functionality
"""

import os
import tempfile
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime

from app.core.dependencies import get_db, get_current_user
from app.db.models.user import User
from app.services.expense_import_service import ExpenseImportService
from app.crud.crud_expense import expense_crud
from app.crud.crud_categorization_rule import categorization_rule_crud
from app.schemas.expense import ExpenseCreate
from app.schemas.categorization_rule import CategorizationRuleCreate, CategorizationRule
from app.services.currency_service import CurrencyConversionService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/preview")
async def preview_expense_import(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    file: UploadFile = File(...)
) -> Any:
    """
    Preview expense import from uploaded file
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    allowed_extensions = {'.xlsx', '.xls', '.csv'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Save uploaded file temporarily
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Initialize import service
        import_service = ExpenseImportService(db)
        
        # Generate preview
        preview_result = import_service.preview_import(
            user_id=str(current_user.id),
            file_path=tmp_file_path
        )
        
        return preview_result
        
    except Exception as e:
        logger.error(f"Error in expense import preview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file: {str(e)}"
        )
    finally:
        # Clean up temporary file
        try:
            if 'tmp_file_path' in locals():
                os.unlink(tmp_file_path)
        except:
            pass


@router.post("/commit")
async def commit_expense_import(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    import_data: dict
) -> Any:
    """
    Commit expense import after user review/editing
    """
    try:
        expenses_data = import_data.get('expenses', [])
        create_rules = import_data.get('create_rules', True)
        generic_tags = import_data.get('generic_tags', [])
        
        if not expenses_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No expenses provided for import"
            )
        
        # Initialize services
        currency_service = CurrencyConversionService(db)
        user_default_currency = current_user.default_currency or "EUR"
        
        # Process each expense
        imported_expenses = []
        created_rules = []
        errors = []
        
        for idx, expense_data in enumerate(expenses_data):
            try:
                # Skip if marked as duplicate and user doesn't want to import
                if expense_data.get('is_duplicate', False) and not expense_data.get('force_import', False):
                    continue
                
                # Skip if user marked as excluded
                if expense_data.get('excluded', False):
                    continue
                
                # Prepare tags - combine automatic, generic, and expense-specific tags
                expense_tags = ['import', f"import:{datetime.now().strftime('%Y-%m')}"]
                
                # Add generic tags if provided
                if generic_tags:
                    expense_tags.extend(generic_tags)
                
                # Add expense-specific tags if provided
                if expense_data.get('tags'):
                    expense_tags.extend(expense_data.get('tags'))
                
                # Remove duplicates while preserving order
                expense_tags = list(dict.fromkeys(expense_tags))
                
                # Create expense object
                expense_create = ExpenseCreate(
                    amount=Decimal(str(expense_data['amount'])),
                    currency=expense_data.get('currency', 'EUR'),
                    description=expense_data['description'],
                    expense_date=datetime.fromisoformat(expense_data['expense_date']).date(),
                    category_id=expense_data.get('category_id'),
                    subcategory_id=expense_data.get('subcategory_id'),
                    payment_method=expense_data.get('payment_method'),
                    vendor=expense_data.get('vendor'),
                    notes=expense_data.get('notes'),
                    tags=expense_tags
                )
                
                # Handle currency conversion
                if expense_create.currency != user_default_currency:
                    try:
                        conversion_result = await currency_service.convert_amount(
                            amount=expense_create.amount,
                            from_currency=expense_create.currency,
                            to_currency=user_default_currency
                        )
                        
                        if conversion_result:
                            expense_create.amount_in_base_currency = conversion_result["converted_amount"]
                            expense_create.exchange_rate = conversion_result["exchange_rate"]
                    except Exception as conv_error:
                        logger.warning(f"Currency conversion failed for expense {idx}: {conv_error}")
                        # Continue without conversion
                else:
                    expense_create.amount_in_base_currency = expense_create.amount
                    expense_create.exchange_rate = Decimal("1.0")
                
                # Create expense
                expense = expense_crud.create_for_user(
                    db, 
                    obj_in=expense_create, 
                    user_id=current_user.id
                )
                imported_expenses.append(str(expense.id))
                
                # Create categorization rules if requested
                if (create_rules and 
                    expense_data.get('category_id') and 
                    expense_data.get('vendor') and
                    expense_data.get('create_rule', True)):
                    
                    try:
                        new_rules = categorization_rule_crud.create_from_expense_categorization(
                            db,
                            user_id=current_user.id,
                            vendor=expense_data.get('vendor'),
                            description=expense_data.get('description'),
                            category_id=expense_data.get('category_id'),
                            subcategory_id=expense_data.get('subcategory_id'),
                            create_vendor_rule=True,
                            create_description_rule=False,
                            confidence=80
                        )
                        created_rules.extend([str(rule.id) for rule in new_rules])
                        
                    except Exception as rule_error:
                        logger.warning(f"Failed to create rule for expense {idx}: {rule_error}")
                        # Continue without creating rule
                
            except Exception as exp_error:
                logger.error(f"Error importing expense {idx}: {exp_error}")
                errors.append({
                    'index': idx,
                    'error': str(exp_error),
                    'expense_data': expense_data
                })
        
        return {
            'success': True,
            'imported_count': len(imported_expenses),
            'error_count': len(errors),
            'imported_expense_ids': imported_expenses,
            'created_rule_ids': created_rules,
            'errors': errors
        }
        
    except Exception as e:
        logger.error(f"Error in expense import commit: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import expenses: {str(e)}"
        )


@router.get("/rules", response_model=List[CategorizationRule])
def get_categorization_rules(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    is_active: bool = None
) -> Any:
    """
    Get user's categorization rules
    """
    rules = categorization_rule_crud.get_by_user(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        is_active=is_active
    )
    return rules


@router.post("/rules", response_model=CategorizationRule, status_code=status.HTTP_201_CREATED)
def create_categorization_rule(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rule_in: CategorizationRuleCreate
) -> Any:
    """
    Create a new categorization rule
    """
    rule = categorization_rule_crud.create_for_user(
        db,
        obj_in=rule_in,
        user_id=current_user.id
    )
    return rule


@router.put("/rules/{rule_id}", response_model=CategorizationRule)
def update_categorization_rule(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rule_id: str,
    rule_update: dict
) -> Any:
    """
    Update a categorization rule
    """
    # Get rule and verify ownership
    rule = categorization_rule_crud.get(db, id=rule_id)
    if not rule or str(rule.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categorization rule not found"
        )
    
    # Update rule
    updated_rule = categorization_rule_crud.update(db, db_obj=rule, obj_in=rule_update)
    return updated_rule


@router.delete("/rules/{rule_id}")
def delete_categorization_rule(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rule_id: str
) -> Any:
    """
    Delete a categorization rule
    """
    success = categorization_rule_crud.delete_for_user(
        db,
        rule_id=rule_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categorization rule not found"
        )
    
    return {"message": "Categorization rule deleted successfully"}


@router.get("/rules/stats")
def get_categorization_stats(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get categorization rule usage statistics
    """
    stats = categorization_rule_crud.get_usage_stats(
        db,
        user_id=current_user.id
    )
    return stats
