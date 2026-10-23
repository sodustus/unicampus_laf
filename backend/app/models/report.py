from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.db.session import Base


class ReportType(str, enum.Enum):
    LOST = "lost"
    FOUND = "found"


class ReportStatus(str, enum.Enum):
    ACTIVE = "active"
    RECOVERED = "recovered"
    CLOSED = "closed"


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(20), index=True, nullable=False)  # "lost" or "found"
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    location = Column(String(255), nullable=False)
    item_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default=ReportStatus.ACTIVE.value, index=True, nullable=False)
    photo_path = Column(String(500), nullable=True)
    identifying_details = Column(Text, nullable=True)  # Restricted visibility (FR-SEARCH-06)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)  # Soft delete

    # Relationships
    category = relationship("Category", back_populates="reports")
    owner = relationship("User", back_populates="reports")
    claims = relationship("Claim", back_populates="report", cascade="all, delete-orphan")
    recovery_records = relationship("RecoveryRecord", back_populates="report", cascade="all, delete-orphan")

