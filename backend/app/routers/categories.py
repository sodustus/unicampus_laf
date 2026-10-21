from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse
from app.core.dependencies import require_admin

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """Returns all available item categories."""
    return db.query(Category).order_by(Category.name.asc()).all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Admin-only: Create a new category."""
    existing = db.query(Category).filter(Category.name.ilike(cat_in.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category already exists",
        )
    category = Category(name=cat_in.name.strip())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
