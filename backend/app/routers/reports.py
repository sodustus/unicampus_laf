from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.report import Report, ReportType, ReportStatus
from app.models.category import Category
from app.models.user import User, UserRole
from app.schemas.report import ReportCreate, ReportUpdate, ReportResponse
from app.core.dependencies import get_current_user, get_optional_current_user

router = APIRouter(prefix="/reports", tags=["Lost & Found Reports"])


@router.get("", response_model=List[ReportResponse])
def browse_and_search_reports(
    type: Optional[str] = Query(None, description="Filter by 'lost' or 'found'"),
    category_id: Optional[int] = Query(None, description="Filter by Category ID"),
    location: Optional[str] = Query(None, description="Filter by location substring"),
    status: Optional[str] = Query("active", description="Filter by status (default: 'active')"),
    q: Optional[str] = Query(None, description="Search keyword in title or description"),
    sort: Optional[str] = Query("newest", description="'newest' or 'oldest'"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    FR-SEARCH-01–04: Search and filter reports with sorting.
    FR-SEARCH-06: Identifying details are NEVER exposed on public listings.
    """
    query = db.query(Report).filter(Report.deleted_at.is_(None))

    if type:
        query = query.filter(Report.type == type.lower())
    if category_id:
        query = query.filter(Report.category_id == category_id)
    if location:
        query = query.filter(Report.location.ilike(f"%{location.strip()}%"))
    if status and status.lower() != "all":
        query = query.filter(Report.status == status.lower())
    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Report.title.ilike(search_pattern),
                Report.description.ilike(search_pattern),
                Report.location.ilike(search_pattern),
            )
        )

    if sort == "oldest":
        query = query.order_by(Report.item_date.asc())
    else:
        query = query.order_by(Report.item_date.desc(), Report.id.desc())

    reports = query.all()

    # FR-SEARCH-06: Sanitize identifying details for public listings
    sanitized_reports = []
    for r in reports:
        # Clone attributes for response without modifying database record
        can_view_proof = current_user and (
            current_user.id == r.owner_id or current_user.role == UserRole.ADMIN.value
        )
        report_dict = {
            "id": r.id,
            "type": r.type,
            "title": r.title,
            "description": r.description,
            "category_id": r.category_id,
            "category": r.category,
            "owner_id": r.owner_id,
            "location": r.location,
            "item_date": r.item_date,
            "status": r.status,
            "photo_path": r.photo_path,
            "identifying_details": r.identifying_details if can_view_proof else None,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        }
        sanitized_reports.append(report_dict)

    return sanitized_reports


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-LOST-01 & FR-FOUND-01: Create a lost or found report under authenticated account.
    """
    # Verify category exists
    category = db.query(Category).filter(Category.id == report_in.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with ID {report_in.category_id} does not exist.",
        )

    new_report = Report(
        type=report_in.type,
        title=report_in.title.strip(),
        description=report_in.description.strip(),
        category_id=report_in.category_id,
        owner_id=current_user.id,
        location=report_in.location.strip(),
        item_date=report_in.item_date,
        status=ReportStatus.ACTIVE.value,
        photo_path=report_in.photo_path,
        identifying_details=report_in.identifying_details,
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report


@router.get("/{report_id}", response_model=ReportResponse)
def get_report_detail(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    FR-SEARCH-05 & FR-SEARCH-06: View full report details.
    Sensitive identifying details are only returned if the viewer is the owner or an admin.
    """
    report = db.query(Report).filter(Report.id == report_id, Report.deleted_at.is_(None)).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or has been deleted.",
        )

    can_view_proof = current_user and (
        current_user.id == report.owner_id or current_user.role == UserRole.ADMIN.value
    )

    return {
        "id": report.id,
        "type": report.type,
        "title": report.title,
        "description": report.description,
        "category_id": report.category_id,
        "category": report.category,
        "owner_id": report.owner_id,
        "location": report.location,
        "item_date": report.item_date,
        "status": report.status,
        "photo_path": report.photo_path,
        "identifying_details": report.identifying_details if can_view_proof else None,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
    }


@router.patch("/{report_id}", response_model=ReportResponse)
def update_report(
    report_id: int,
    report_in: ReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-LOST-04 & FR-FOUND-05: Owner can edit report while it is Active.
    """
    report = db.query(Report).filter(Report.id == report_id, Report.deleted_at.is_(None)).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    is_owner = report.owner_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN.value

    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to modify this report.",
        )

    if report.status != ReportStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Active reports can be edited.",
        )

    update_data = report_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(report, field, val)

    report.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(report)
    return report


@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-LOST-06, FR-FOUND-05, FR-AUDIT-03: Soft-delete report (hidden from normal listings).
    """
    report = db.query(Report).filter(Report.id == report_id, Report.deleted_at.is_(None)).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    is_owner = report.owner_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN.value

    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this report.",
        )

    report.deleted_at = datetime.now(timezone.utc)
    report.status = ReportStatus.CLOSED.value
    db.commit()
    return {"message": "Report has been deleted successfully."}


@router.post("/{report_id}/recover", response_model=ReportResponse)
def mark_report_recovered(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-LOST-05 & FR-RECOVER-01: Owner directly marks a lost report as Recovered.
    """
    report = db.query(Report).filter(Report.id == report_id, Report.deleted_at.is_(None)).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    is_owner = report.owner_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN.value

    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to mark this report as recovered.",
        )

    report.status = ReportStatus.RECOVERED.value
    report.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(report)
    return report
