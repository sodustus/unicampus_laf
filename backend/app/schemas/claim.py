from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime
from typing import Optional, Literal
from app.schemas.report import ReportResponse
from app.schemas.user import UserResponse


class VerificationRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    proof_details: str
    additional_info: Optional[str] = None
    submitted_at: datetime


class ClaimCreate(BaseModel):
    proof_details: str = Field(
        ...,
        min_length=5,
        description="Proof of ownership: serial numbers, distinguishing markings, purchase receipts, or specific features.",
    )


class ClaimStatusUpdate(BaseModel):
    status: Literal["under_review", "awaiting_info", "approved", "rejected", "handover_failed"]
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


class HandoverFailureRequest(BaseModel):
    reason: str = Field(
        ...,
        min_length=3,
        description="Reason why physical handover failed (e.g. item did not match description, wrong serial number)",
    )


class ClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: int
    claimant_id: int
    status: str
    reviewer_id: Optional[int] = None
    rejection_reason: Optional[str] = None
    finder_handover_failed: bool = False
    claimant_handover_failed: bool = False
    handover_failure_notes: Optional[str] = None
    queue_position: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    # Associated models
    report: Optional[ReportResponse] = None
    claimant: Optional[UserResponse] = None
    finder: Optional[UserResponse] = None
    verification_record: Optional[VerificationRecordResponse] = None

    @model_validator(mode="after")
    def mask_contact_info_if_not_approved(self):
        if self.status not in ["approved", "completed"]:
            if self.finder and self.finder.phone_number:
                self.finder = self.finder.model_copy(update={"phone_number": None})
            if self.claimant and self.claimant.phone_number:
                self.claimant = self.claimant.model_copy(update={"phone_number": None})
        return self
