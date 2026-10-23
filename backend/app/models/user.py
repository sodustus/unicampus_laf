from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime, timezone
import enum
from app.db.session import Base
from sqlalchemy.orm import relationship


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.USER.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    full_name = Column(String(150), nullable=True)
    phone_number = Column(String(30), nullable=True)
    department = Column(String(100), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    reports = relationship("Report", back_populates="owner", cascade="all, delete-orphan")
    claims = relationship("Claim", foreign_keys="Claim.claimant_id", back_populates="claimant")
    recoveries_handled = relationship(
        "RecoveryRecord",
        foreign_keys="RecoveryRecord.responsible_user_id",
        back_populates="responsible_user",
    )
    audit_actions = relationship(
        "AuditLog",
        foreign_keys="AuditLog.actor_id",
        back_populates="actor",
    )

