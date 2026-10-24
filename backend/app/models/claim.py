from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.db.session import Base


class ClaimStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    AWAITING_INFO = "awaiting_info"
    APPROVED = "approved"
    REJECTED = "rejected"
    HANDOVER_FAILED = "handover_failed"
    COMPLETED = "completed"


class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    claimant_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(30), default=ClaimStatus.SUBMITTED.value, nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    finder_handover_failed = Column(Boolean, default=False, nullable=False)
    claimant_handover_failed = Column(Boolean, default=False, nullable=False)
    owner_confirmed_receipt = Column(Boolean, default=False, nullable=False)
    handover_failure_notes = Column(Text, nullable=True)

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

    # Relationships
    report = relationship("Report", back_populates="claims")
    claimant = relationship("User", foreign_keys=[claimant_id], back_populates="claims")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    verification_record = relationship(
        "VerificationRecord",
        uselist=False,
        back_populates="claim",
        cascade="all, delete-orphan",
    )
    recovery_record = relationship(
        "RecoveryRecord",
        uselist=False,
        back_populates="claim",
    )

    @property
    def finder(self):
        if not self.report:
            return None
        if self.report.type == "lost":
            return self.claimant
        return self.report.owner

    @property
    def owner(self):
        if not self.report:
            return None
        if self.report.type == "lost":
            return self.report.owner
        return self.claimant


class VerificationRecord(Base):
    __tablename__ = "verification_records"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"), unique=True, nullable=False, index=True)
    proof_details = Column(Text, nullable=False)
    additional_info = Column(Text, nullable=True)
    submitted_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship
    claim = relationship("Claim", back_populates="verification_record")
