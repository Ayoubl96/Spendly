from typing import List, Optional, Literal
from datetime import date
from pydantic import BaseModel, Field, validator
from uuid import UUID


# Enums
GroupByType = Literal["day", "week", "month"]


# Request Schemas


class AnalyticsRequest(BaseModel):
    start_date: date = Field(..., description="Start date of the analytics period")
    end_date: date = Field(..., description="End date of the analytics period")
    category_ids: Optional[List[UUID]] = Field(
        None, description="List of category IDs to filter by"
    )
    group_by: GroupByType = Field(
        "month", description="Grouping type for the analytics data"
    )
    include_previous_period: bool = Field(
        False, description="Include data from the previous period"
    )

    @validator("end_date")
    def end_date_after_start_date(cls, v, values):
        if "start_date" in values and v < values["start_date"]:
            raise ValueError("End date must be after start date")
        return v


# Response schemas
class CategoryBreakdown(BaseModel):
    category_id: UUID
    category_name: str
    amount: str
    currency: str

    class Config:
        from_attributes = True


class AnalyticsDataPoint(BaseModel):
    date: str
    total_amount: str
    currency: str
    category_breakdowns: List[CategoryBreakdown]

    class Config:
        from_attributes = True


class AnalyticsSummary(BaseModel):
    total_current: str
    total_previous: Optional[str] = None
    change_percentage: Optional[str] = None
    average_per_period: str
    currency: str
    period_count: int

    class Config:
        from_attributes = True


class AnalyticsResponse(BaseModel):
    current_period: List[AnalyticsDataPoint]
    previous_period: Optional[List[AnalyticsDataPoint]]
    summary: AnalyticsSummary
    request: AnalyticsRequest

    class Config:
        from_attributes = True


# Export Schemas


class ExportFormat(BaseModel):
    format: Literal["csv"] = "csv"


class ExportRequest(BaseModel):
    format: Literal["csv"] = "csv"
