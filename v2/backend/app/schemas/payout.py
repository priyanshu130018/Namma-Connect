"""Pydantic schemas for Provider Payouts and Settlement Ledgers."""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PayoutItemResponse(BaseModel):
    id: str
    payout_code: str
    provider_id: str
    amount: float
    currency: str = "INR"
    status: str  # PENDING, PROCESSING, COMPLETED, FAILED
    beneficiary_name: Optional[str] = None
    bank_account_last4: Optional[str] = None
    ifsc_code: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProviderPayoutSummaryResponse(BaseModel):
    available_balance: float = Field(..., description="Unreleased net earnings available for withdrawal")
    processing_balance: float = Field(0.0, description="In-flight payouts currently being settled")
    paid_out_balance: float = Field(0.0, description="Total successfully disbursed funds")
    failed_balance: float = Field(0.0, description="Failed payout attempts requiring host review")
    currency: str = "INR"
    payouts: List[PayoutItemResponse] = Field(default_factory=list, description="Historical payout disbursements")

    model_config = ConfigDict(from_attributes=True)


class PayoutCreateRequest(BaseModel):
    amount: Optional[float] = Field(None, gt=0, description="Specific payout amount, or full available balance if omitted")
    bank_account_last4: Optional[str] = Field(None, max_length=10, description="Masked account identifier (e.g. 4092)")
    ifsc_code: Optional[str] = Field(None, max_length=32, description="Bank branch IFSC code")
