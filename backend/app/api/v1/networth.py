from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.models.net_worth import NetWorthSnapshot
from app.models.asset import Asset
from app.schemas.net_worth import (
    NetWorthSnapshot as NetWorthSnapshotSchema,
    NetWorthSnapshotCreate,
    NetWorthSnapshotUpdate,
    NetWorthSummary
)

router = APIRouter()


@router.get("/", response_model=List[NetWorthSnapshotSchema])
async def list_snapshots(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List net worth snapshots.
    """
    snapshots = db.query(NetWorthSnapshot).filter(
        NetWorthSnapshot.user_id == current_user.id
    ).order_by(NetWorthSnapshot.date.desc()).offset(skip).limit(limit).all()
    
    return snapshots


@router.get("/summary", response_model=NetWorthSummary)
async def get_net_worth_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get net worth summary with trends.
    """
    # Get latest snapshot
    latest = db.query(NetWorthSnapshot).filter(
        NetWorthSnapshot.user_id == current_user.id
    ).order_by(NetWorthSnapshot.date.desc()).first()
    
    if not latest:
        # Calculate from current assets
        assets = db.query(Asset).filter(Asset.user_id == current_user.id).all()
        total_assets = sum(asset.value for asset in assets)
        
        return NetWorthSummary(
            current_net_worth=total_assets,
            current_assets=total_assets,
            current_liabilities=0,
            currency="USD",
            last_update=None,
            change_1m=0,
            change_3m=0,
            change_6m=0,
            change_1y=0,
            change_percentage_1m=0,
            change_percentage_3m=0,
            change_percentage_6m=0,
            change_percentage_1y=0,
            trends=[]
        )
    
    # Calculate changes for different periods
    today = date.today()
    periods = {
        "1m": 30,
        "3m": 90,
        "6m": 180,
        "1y": 365
    }
    
    changes = {}
    change_percentages = {}
    
    for period_name, days in periods.items():
        period_date = today - timedelta(days=days)
        period_snapshot = db.query(NetWorthSnapshot).filter(
            NetWorthSnapshot.user_id == current_user.id,
            NetWorthSnapshot.date <= period_date
        ).order_by(NetWorthSnapshot.date.desc()).first()
        
        if period_snapshot:
            change = latest.net_worth - period_snapshot.net_worth
            change_percentage = (change / period_snapshot.net_worth * 100) if period_snapshot.net_worth != 0 else 0
        else:
            change = 0
            change_percentage = 0
        
        changes[f"change_{period_name}"] = change
        change_percentages[f"change_percentage_{period_name}"] = change_percentage
    
    # Get recent trends
    recent_snapshots = db.query(NetWorthSnapshot).filter(
        NetWorthSnapshot.user_id == current_user.id
    ).order_by(NetWorthSnapshot.date.desc()).limit(12).all()
    
    trends = []
    for i in range(len(recent_snapshots) - 1, -1, -1):
        snapshot = recent_snapshots[i]
        if i < len(recent_snapshots) - 1:
            prev_snapshot = recent_snapshots[i + 1]
            change_amount = snapshot.net_worth - prev_snapshot.net_worth
            change_percentage = (change_amount / prev_snapshot.net_worth * 100) if prev_snapshot.net_worth != 0 else 0
        else:
            change_amount = 0
            change_percentage = 0
        
        trends.append({
            "date": snapshot.date,
            "net_worth": snapshot.net_worth,
            "total_assets": snapshot.total_assets,
            "total_liabilities": snapshot.total_liabilities,
            "change_amount": change_amount,
            "change_percentage": change_percentage
        })
    
    return NetWorthSummary(
        current_net_worth=latest.net_worth,
        current_assets=latest.total_assets,
        current_liabilities=latest.total_liabilities,
        currency=latest.currency,
        last_update=latest.date,
        **changes,
        **change_percentages,
        trends=trends
    )


@router.get("/{snapshot_id}", response_model=NetWorthSnapshotSchema)
async def get_snapshot(
    snapshot_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get a specific net worth snapshot.
    """
    snapshot = db.query(NetWorthSnapshot).filter(
        NetWorthSnapshot.id == snapshot_id,
        NetWorthSnapshot.user_id == current_user.id
    ).first()
    
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snapshot not found"
        )
    
    return snapshot


@router.post("/", response_model=NetWorthSnapshotSchema, status_code=status.HTTP_201_CREATED)
async def create_snapshot(
    snapshot_data: NetWorthSnapshotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Create a new net worth snapshot.
    """
    # Check if snapshot already exists for this date
    existing = db.query(NetWorthSnapshot).filter(
        NetWorthSnapshot.user_id == current_user.id,
        NetWorthSnapshot.date == snapshot_data.date
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snapshot already exists for this date"
        )
    
    # Create snapshot
    db_snapshot = NetWorthSnapshot(
        **snapshot_data.dict(),
        user_id=current_user.id
    )
    
    db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    
    return db_snapshot


@router.post("/calculate", response_model=NetWorthSnapshotSchema, status_code=status.HTTP_201_CREATED)
async def calculate_snapshot(
    snapshot_date: date = date.today(),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Calculate and create a net worth snapshot based on current assets.
    """
    # Check if snapshot already exists for this date
    existing = db.query(NetWorthSnapshot).filter(
        NetWorthSnapshot.user_id == current_user.id,
        NetWorthSnapshot.date == snapshot_date
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snapshot already exists for this date"
        )
    
    # Get all assets
    assets = db.query(Asset).filter(Asset.user_id == current_user.id).all()
    
    # Calculate totals
    total_assets = Decimal(0)
    asset_breakdown = {}
    
    for asset in assets:
        total_assets += asset.value
        if asset.type.value not in asset_breakdown:
            asset_breakdown[asset.type.value] = 0
        asset_breakdown[asset.type.value] += float(asset.value)
    
    # For now, we don't have liability tracking, so net worth = total assets
    total_liabilities = Decimal(0)
    net_worth = total_assets - total_liabilities
    
    # Create snapshot
    db_snapshot = NetWorthSnapshot(
        user_id=current_user.id,
        date=snapshot_date,
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        net_worth=net_worth,
        currency="USD",  # TODO: Get from user preferences
        asset_breakdown=asset_breakdown,
        liability_breakdown={}
    )
    
    db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    
    return db_snapshot


@router.put("/{snapshot_id}", response_model=NetWorthSnapshotSchema)
async def update_snapshot(
    snapshot_id: UUID,
    snapshot_update: NetWorthSnapshotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Update a net worth snapshot.
    """
    # Get existing snapshot
    snapshot = db.query(NetWorthSnapshot).filter(
        NetWorthSnapshot.id == snapshot_id,
        NetWorthSnapshot.user_id == current_user.id
    ).first()
    
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snapshot not found"
        )
    
    # Update snapshot
    update_data = snapshot_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(snapshot, field, value)
    
    # Recalculate net worth if assets or liabilities changed
    if "total_assets" in update_data or "total_liabilities" in update_data:
        snapshot.net_worth = snapshot.total_assets - snapshot.total_liabilities
    
    db.commit()
    db.refresh(snapshot)
    
    return snapshot


@router.delete("/{snapshot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_snapshot(
    snapshot_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Delete a net worth snapshot.
    """
    snapshot = db.query(NetWorthSnapshot).filter(
        NetWorthSnapshot.id == snapshot_id,
        NetWorthSnapshot.user_id == current_user.id
    ).first()
    
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snapshot not found"
        )
    
    db.delete(snapshot)
    db.commit()