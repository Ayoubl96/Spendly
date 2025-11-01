"""
Analytics API endpoints
"""

from typing import Any
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date
import csv
import io
from uuid import UUID


from app.core.dependencies import get_db, get_current_user
from app.db.models.user import User
from app.schemas.analytics import AnalyticsResponse, AnalyticsRequest, GroupByType
from app.crud.crud_analytics import analytics_crud

router = APIRouter()


@router.get("/expenses", response_model=AnalyticsResponse)
def get_expense_analytics(
    start_date: date,
    end_date: date,
    group_by: GroupByType,
    include_previous_period: bool,
    category_ids: str = Query(None, description="Comma-separated list of category IDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalyticsResponse:
    current_period = analytics_crud.get_analytics_data(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
        category_ids=category_ids,
    )

    previous_period = None

    if include_previous_period:
        prev_start, prev_end = analytics_crud.getprevious_period_dates(start_date, end_date)
        previous_period = analytics_crud.get_analytics_data(
            db=db,
            user_id=current_user.id,
            start_date=prev_start,
            end_date=prev_end,
            group_by=group_by,
            category_ids=category_ids,
        )

    currency = current_period[0]["currency"] if current_period else "EUR"

    summary = analytics_crud.calculate_summary(
        current_period_data=current_period,
        previous_period_data=previous_period,
        currency=currency,
    )

    request_parms = AnalyticsRequest(
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
        category_ids=category_ids,
        include_previous_period=include_previous_period,
    )
    return AnalyticsResponse(
        request=request_parms,
        current_period=current_period,
        previous_period=previous_period,
        summary=summary,
    )
