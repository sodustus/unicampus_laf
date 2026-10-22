from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal
from app.schemas.report import ReportResponse
from app.schemas.user import UserResponse


class VerificationRecordResponse(BaseModel):
    id: int
    proof_details: str
    additional_info: Optional[str] = None
    submitted_at: datetime

    class Config:
        from_attributes = True


class ClaimCreate(BaseModel):
    proof_details: str = Field(
        ...,
        min_length=5,
        description="Proof of ownership: serial numbers, distinguishing markings, purchase receipts, or specific features.",
    )


class ClaimStatusUpdate(BaseModel):
    status: Literal["under_review", "awaiting_info", "approved", "rejected"]
    rejection_reason: Optional[str] = Field(
        None,
        description="Reason for rejection (mandatory when status is 'rejected')",
    )


class ClaimRespondInfo(BaseModel):
    additional_info: str = Field(
        ...,
        min_length=3,
        description="Additional proof or clarifying information provided by the claimant.",
    )


class ClaimResponse(BaseModel):
    id: int
    report_id: int
    claimant_id: int
    status: str
    reviewer_id: Optional[int] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Associated models
    report: Optional[ReportResponse] = None
    claimant: Optional[UserResponse] = None
    verification_record: Optional[VerificationRecordResponse] = None

    class Config:
        from_attributes = True
