from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, Literal
from app.schemas.category import CategoryResponse
from app.schemas.user import UserResponse


class ReportCreate(BaseModel):
    type: Literal["lost", "found"] = Field(..., description="Report type: 'lost' or 'found'")
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5)
    category_id: int
    location: str = Field(..., min_length=2, max_length=255)
    item_date: datetime
    possession_status: Optional[str] = Field(
        None,
        description="Physical custody: 'lost_unknown', 'with_finder', 'submitted_to_authority', 'returned'",
    )
    custody_location: Optional[str] = Field(
        None,
        description="Where the item was submitted (e.g. Science Library Desk, Guard Office)",
    )
    photo_path: Optional[str] = None
    identifying_details: Optional[str] = Field(
        None,
        description="Private ownership verification proof (hidden from public view)",
    )


class ReportUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=5)
    category_id: Optional[int] = None
    location: Optional[str] = Field(None, min_length=2, max_length=255)
    item_date: Optional[datetime] = None
    possession_status: Optional[str] = None
    custody_location: Optional[str] = None
    photo_path: Optional[str] = None
    identifying_details: Optional[str] = None


class FoundNoticeCreate(BaseModel):
    founder_proof: str = Field(
        ...,
        min_length=5,
        description="Double-blind proof of distinguishing marks, serial numbers, stickers, or contents observed on item",
    )
    possession_status: Literal["with_finder", "submitted_to_authority"] = Field(
        ...,
        description="Custody status: 'with_finder' or 'submitted_to_authority'",
    )
    custody_location: Optional[str] = Field(
        None,
        description="Office/Desk where item was submitted, if submitted_to_authority",
    )
    found_notes: Optional[str] = Field(
        None,
        description="Message or notes from the finder to the owner",
    )


class ReportDeleteRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Optional reason for deletion (e.g. Duplicate of Report #12)")


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    description: str
    category_id: int
    category: Optional[CategoryResponse] = None
    owner_id: int
    owner: Optional[UserResponse] = None
    location: str
    item_date: datetime
    status: str
    possession_status: str = "lost_unknown"
    custody_location: Optional[str] = None
    founder_id: Optional[int] = None
    found_notes: Optional[str] = None
    founder: Optional[UserResponse] = None
    claim_status: Optional[str] = None
    claim_id: Optional[int] = None
    user_has_claimed: bool = False
    user_claim_status: Optional[str] = None
    photo_path: Optional[str] = None
    identifying_details: Optional[str] = None
    deletion_reason: Optional[str] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
