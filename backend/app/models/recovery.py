from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base


class RecoveryRecord(Base):
    __tablename__ = "recovery_records"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"), nullable=True, index=True)
    responsible_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    handover_notes = Column(Text, nullable=True)
    recovered_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    report = relationship("Report", back_populates="recovery_records")
    claim = relationship("Claim", back_populates="recovery_record")
    responsible_user = relationship("User", foreign_keys=[responsible_user_id], back_populates="recoveries_handled")
