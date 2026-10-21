from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.session import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)

    reports = relationship("Report", back_populates="category", cascade="all, delete-orphan")
