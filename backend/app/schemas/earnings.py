"""Pydantic schemas for Provider Earnings and Financial Reporting."""

from typing import List
from pydantic import BaseModel, ConfigDict, Field


class EarningsDataPoint(BaseModel):
    date: str = Field(..., description="Date or month label (YYYY-MM-DD or Mon YYYY)")
    amount: float = Field(0.0, description="Net earnings amount in INR")
    bookings_count: int = Field(0, description="Total completed/eligible bookings in this bucket")


class ProviderEarningsResponse(BaseModel):
    period: str = Field(..., description="Selected time interval: 7d, 30d, or 1y")
    total_earnings: float = Field(..., description="Total net earnings payable to host (95%)")
    gross_revenue: float = Field(..., description="Gross booking revenue before fees")
    platform_fee: float = Field(..., description="5% platform maintenance and gateway fee")
    currency: str = "INR"
    booking_count: int = Field(..., description="Total eligible bookings in period")
    data: List[EarningsDataPoint] = Field(default_factory=list, description="Chronological time-series data points")

    model_config = ConfigDict(from_attributes=True)
