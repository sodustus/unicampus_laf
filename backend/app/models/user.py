from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
import enum
from app.db.session import Base


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


from sqlalchemy.orm import relationship


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.USER.value, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    reports = relationship("Report", back_populates="owner", cascade="all, delete-orphan")
