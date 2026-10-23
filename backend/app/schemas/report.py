from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, Literal
from app.schemas.category import CategoryResponse


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


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    description: str
    category_id: int
    category: Optional[CategoryResponse] = None
    owner_id: int
    location: str
    item_date: datetime
    status: str
    possession_status: str = "lost_unknown"
    custody_location: Optional[str] = None
    photo_path: Optional[str] = None
    identifying_details: Optional[str] = None
    created_at: datetime
    updated_at: datetime
