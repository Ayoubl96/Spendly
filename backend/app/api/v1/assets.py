from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.asset import Asset
from app.schemas.asset import (
    Asset as AssetSchema,
    AssetCreate,
    AssetUpdate,
    AssetSummary
)

router = APIRouter()


@router.get("/", response_model=List[AssetSchema])
async def list_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List all user assets.
    """
    assets = db.query(Asset).filter(Asset.user_id == current_user.id).all()
    return assets


@router.get("/summary", response_model=AssetSummary)
async def get_asset_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get asset summary with totals and breakdown by type.
    """
    assets = db.query(Asset).filter(Asset.user_id == current_user.id).all()
    
    total_assets = sum(asset.value for asset in assets)
    liquid_assets = sum(asset.value for asset in assets if asset.is_liquid)
    illiquid_assets = sum(asset.value for asset in assets if not asset.is_liquid)
    
    # Group by type
    assets_by_type = {}
    for asset in assets:
        if asset.type.value not in assets_by_type:
            assets_by_type[asset.type.value] = 0
        assets_by_type[asset.type.value] += float(asset.value)
    
    return AssetSummary(
        total_assets=total_assets,
        liquid_assets=liquid_assets,
        illiquid_assets=illiquid_assets,
        asset_count=len(assets),
        assets_by_type=assets_by_type,
        assets=assets
    )


@router.get("/{asset_id}", response_model=AssetSchema)
async def get_asset(
    asset_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get a specific asset by ID.
    """
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.user_id == current_user.id
    ).first()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    return asset


@router.post("/", response_model=AssetSchema, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset_data: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Create a new asset.
    """
    # Check for duplicate name
    existing = db.query(Asset).filter(
        Asset.user_id == current_user.id,
        Asset.name == asset_data.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset with this name already exists"
        )
    
    # Create asset
    db_asset = Asset(
        **asset_data.dict(),
        user_id=current_user.id
    )
    
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    return db_asset


@router.put("/{asset_id}", response_model=AssetSchema)
async def update_asset(
    asset_id: UUID,
    asset_update: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Update an asset.
    """
    # Get existing asset
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.user_id == current_user.id
    ).first()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    # Check for duplicate name if name is being updated
    if asset_update.name and asset_update.name != asset.name:
        existing = db.query(Asset).filter(
            Asset.user_id == current_user.id,
            Asset.name == asset_update.name,
            Asset.id != asset_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Asset with this name already exists"
            )
    
    # Update asset
    update_data = asset_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asset, field, value)
    
    asset.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(asset)
    
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Delete an asset.
    """
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.user_id == current_user.id
    ).first()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    db.delete(asset)
    db.commit()