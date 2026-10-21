from pydantic import BaseModel, Field
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
    photo_path: Optional[str] = None
    identifying_details: Optional[str] = None


class ReportResponse(BaseModel):
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
    photo_path: Optional[str] = None
    identifying_details: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
