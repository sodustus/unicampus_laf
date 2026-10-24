from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.report import Report, ReportType, ReportStatus, PossessionStatus
from app.models.category import Category
from app.models.user import User, UserRole
from app.schemas.report import ReportCreate, ReportUpdate, ReportResponse, FoundNoticeCreate, ReportDeleteRequest
from app.core.dependencies import get_current_user, get_optional_current_user, require_admin
from app.models.recovery import RecoveryRecord
from app.models.claim import Claim, ClaimStatus, VerificationRecord
from app.services.audit import log_audit

router = APIRouter(prefix="/reports", tags=["Lost & Found Reports"])


@router.get("", response_model=List[ReportResponse])
def browse_and_search_reports(
    type: Optional[str] = Query(None, description="Filter by 'lost' or 'found'"),
    category_id: Optional[int] = Query(None, description="Filter by Category ID"),
    location: Optional[str] = Query(None, description="Filter by location substring"),
    status: Optional[str] = Query("active", description="Filter by status (default: 'active')"),
    possession_status: Optional[str] = Query(None, description="Filter by possession status"),
    q: Optional[str] = Query(None, description="Search keyword in title or description"),
    sort: Optional[str] = Query("newest", description="'newest' or 'oldest'"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    FR-SEARCH-01–04: Search and filter reports with sorting.
    FR-SEARCH-06: Identifying details are NEVER exposed on public listings.
    """
    if status and status.lower() == "deleted":
        if not (current_user and current_user.role == UserRole.ADMIN.value):
            raise HTTPException(
                status_code=403,
                detail="Only administrators can view deleted reports.",
            )
        query = db.query(Report).filter(Report.deleted_at.is_not(None))
    else:
        query = db.query(Report).filter(Report.deleted_at.is_(None))
        if status and status.lower() != "all":
            query = query.filter(Report.status == status.lower())

    if type and type.lower() != "all":
        query = query.filter(Report.type == type.lower())
    if category_id:
        query = query.filter(Report.category_id == category_id)
    if location:
        query = query.filter(Report.location.ilike(f"%{location.strip()}%"))
    if possession_status and possession_status.lower() != "all":
        query = query.filter(Report.possession_status == possession_status.lower())
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

    # Eager load relationships to eliminate N+1 queries
    query = query.options(
        joinedload(Report.category),
        joinedload(Report.owner),
        joinedload(Report.founder),
        selectinload(Report.claims),
    )

    reports = query.all()

    # FR-SEARCH-06: Sanitize identifying details for public listings
    sanitized_reports = []
    for r in reports:
        # Clone attributes for response without modifying database record
        can_view_proof = current_user and (
            current_user.id == r.owner_id or current_user.role == UserRole.ADMIN.value
        )
        user_claims = [c for c in r.claims if current_user and c.claimant_id == current_user.id]
        active_statuses = {
            ClaimStatus.SUBMITTED.value,
            ClaimStatus.UNDER_REVIEW.value,
            ClaimStatus.AWAITING_INFO.value,
            ClaimStatus.APPROVED.value,
        }
        has_active_claim = any(c.status in active_statuses for c in user_claims)
        latest_user_claim = max(user_claims, key=lambda c: c.id) if user_claims else None
        latest_user_status = latest_user_claim.status if latest_user_claim else None

        report_dict = {
            "id": r.id,
            "type": r.type,
            "title": r.title,
            "description": r.description,
            "category_id": r.category_id,
            "category": r.category,
            "owner_id": r.owner_id,
            "owner": r.owner,
            "location": r.location,
            "item_date": r.item_date,
            "status": r.status,
            "possession_status": r.possession_status,
            "custody_location": r.custody_location,
            "founder_id": r.founder_id,
            "found_notes": r.found_notes,
            "founder": r.founder,
            "claim_status": r.claims[0].status if r.claims else None,
            "claim_id": r.claims[0].id if r.claims else None,
            "user_has_claimed": has_active_claim,
            "user_claim_status": latest_user_status,
            "photo_path": r.photo_path,
            "identifying_details": r.identifying_details if can_view_proof else None,
            "deletion_reason": r.deletion_reason,
            "deleted_at": r.deleted_at,
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

    initial_possession = report_in.possession_status
    if not initial_possession:
        if report_in.type == ReportType.FOUND.value:
            initial_possession = PossessionStatus.WITH_FINDER.value
        else:
            initial_possession = PossessionStatus.LOST_UNKNOWN.value

    new_report = Report(
        type=report_in.type,
        title=report_in.title.strip(),
        description=report_in.description.strip(),
        category_id=report_in.category_id,
        owner_id=current_user.id,
        location=report_in.location.strip(),
        item_date=report_in.item_date,
        status=ReportStatus.ACTIVE.value,
        possession_status=initial_possession,
        custody_location=report_in.custody_location.strip() if report_in.custody_location else None,
        photo_path=report_in.photo_path,
        identifying_details=report_in.identifying_details,
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # Log audit entry (FR-AUDIT-01)
    log_audit(
        db=db,
        action="REPORT_CREATED",
        target_type="report",
        target_id=new_report.id,
        actor_id=current_user.id,
        details=f"{new_report.type.capitalize()} report created: {new_report.title} (location: {new_report.location})",
    )
    db.commit()

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
    report = (
        db.query(Report)
        .options(
            joinedload(Report.category),
            joinedload(Report.owner),
            joinedload(Report.founder),
            selectinload(Report.claims),
        )
        .filter(Report.id == report_id)
        .first()
    )
    if not report or (report.deleted_at is not None and not (current_user and current_user.role == UserRole.ADMIN.value)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or has been deleted.",
        )

    can_view_proof = current_user and (
        current_user.id == report.owner_id or current_user.role == UserRole.ADMIN.value
    )

    user_claims = [c for c in report.claims if current_user and c.claimant_id == current_user.id]
    active_statuses = {
        ClaimStatus.SUBMITTED.value,
        ClaimStatus.UNDER_REVIEW.value,
        ClaimStatus.AWAITING_INFO.value,
        ClaimStatus.APPROVED.value,
    }
    has_active_claim = any(c.status in active_statuses for c in user_claims)
    latest_user_claim = max(user_claims, key=lambda c: c.id) if user_claims else None
    latest_user_status = latest_user_claim.status if latest_user_claim else None

    return {
        "id": report.id,
        "type": report.type,
        "title": report.title,
        "description": report.description,
        "category_id": report.category_id,
        "category": report.category,
        "owner_id": report.owner_id,
        "owner": report.owner,
        "location": report.location,
        "item_date": report.item_date,
        "status": report.status,
        "possession_status": report.possession_status,
        "custody_location": report.custody_location,
        "founder_id": report.founder_id,
        "found_notes": report.found_notes,
        "founder": report.founder,
        "claim_status": report.claims[0].status if report.claims else None,
        "claim_id": report.claims[0].id if report.claims else None,
        "user_has_claimed": has_active_claim,
        "user_claim_status": latest_user_status,
        "photo_path": report.photo_path,
        "identifying_details": report.identifying_details if can_view_proof else None,
        "deletion_reason": report.deletion_reason,
        "deleted_at": report.deleted_at,
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
    delete_in: Optional[ReportDeleteRequest] = None,
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
    if delete_in and delete_in.reason:
        report.deletion_reason = delete_in.reason.strip()

    # Log audit entry (FR-AUDIT-01, FR-AUDIT-03)
    log_audit(
        db=db,
        action="REPORT_DELETED",
        target_type="report",
        target_id=report.id,
        actor_id=current_user.id,
        details=f"Report #{report.id} ({report.title}) soft-deleted by user #{current_user.id}. Reason: {report.deletion_reason or 'No reason provided'}",
    )

    db.commit()
    return {"message": "Report has been deleted successfully."}


@router.post("/{report_id}/restore", response_model=ReportResponse)
def restore_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Admin-only: Rollback / restore a soft-deleted report to Active state.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    if not report.deleted_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report is not deleted.")

    report.deleted_at = None
    report.status = ReportStatus.ACTIVE.value
    report.deletion_reason = None
    report.updated_at = datetime.now(timezone.utc)

    log_audit(
        db=db,
        action="REPORT_RESTORED",
        target_type="report",
        target_id=report.id,
        actor_id=admin_user.id,
        details=f"Report #{report.id} ({report.title}) restored by admin #{admin_user.id}",
    )

    db.commit()
    db.refresh(report)
    return report


@router.post("/{report_id}/found-notice", response_model=ReportResponse)
def submit_found_notice(
    report_id: int,
    notice_in: FoundNoticeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Issue #7: Another student notifies the owner of a lost report that they found the item.
    Enforces double-blind proof and creates a verification Claim requiring Admin approval before handover.
    """
    report = db.query(Report).filter(Report.id == report_id, Report.deleted_at.is_(None)).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    if report.type != ReportType.LOST.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Found notices can only be submitted for 'lost' item reports.",
        )

    if report.status != ReportStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This lost report is no longer active.",
        )

    if report.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot submit a found notice on your own lost report. A user cannot be both the reporter and claimer/finder on the same report.",
        )

    # Rule: A person cannot submit multiple notices while their notice is being processed
    active_user_claim = (
        db.query(Claim)
        .filter(
            Claim.report_id == report_id,
            Claim.claimant_id == current_user.id,
            Claim.status.in_([
                ClaimStatus.SUBMITTED.value,
                ClaimStatus.UNDER_REVIEW.value,
                ClaimStatus.AWAITING_INFO.value,
                ClaimStatus.APPROVED.value,
            ]),
        )
        .first()
    )
    if active_user_claim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a found notice currently being processed for this item. You cannot submit multiple notices while under review.",
        )

    # Check for active claim on this report
    existing_claim = (
        db.query(Claim)
        .filter(
            Claim.report_id == report_id,
            Claim.status.in_([
                ClaimStatus.SUBMITTED.value,
                ClaimStatus.UNDER_REVIEW.value,
                ClaimStatus.AWAITING_INFO.value,
                ClaimStatus.APPROVED.value,
            ]),
        )
        .first()
    )
    if existing_claim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A finder notice or verification claim is already pending review for this item.",
        )

    report.founder_id = current_user.id
    report.possession_status = notice_in.possession_status
    report.custody_location = notice_in.custody_location.strip() if notice_in.custody_location else None
    report.found_notes = notice_in.found_notes.strip() if notice_in.found_notes else None
    report.updated_at = datetime.now(timezone.utc)

    # Create Claim for double-blind verification by admin
    new_claim = Claim(
        report_id=report.id,
        claimant_id=current_user.id,
        status=ClaimStatus.SUBMITTED.value,
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)

    # Attach double-blind proof in VerificationRecord
    custody_info = f"Custody: {report.possession_status}" + (f" ({report.custody_location})" if report.custody_location else "")
    verification = VerificationRecord(
        claim_id=new_claim.id,
        proof_details=notice_in.founder_proof.strip(),
        additional_info=custody_info,
    )
    db.add(verification)

    # Log audit entry
    finder_name = current_user.full_name or current_user.email
    log_audit(
        db=db,
        action="FOUND_NOTICE_SUBMITTED",
        target_type="claim",
        target_id=new_claim.id,
        actor_id=current_user.id,
        details=f"Finder #{current_user.id} ({finder_name}) submitted found notice with double-blind proof for lost report #{report.id} ('{report.title}'). Pending admin review.",
    )

    db.commit()
    db.refresh(report)

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
        "possession_status": report.possession_status,
        "custody_location": report.custody_location,
        "founder_id": report.founder_id,
        "found_notes": report.found_notes,
        "founder": report.founder,
        "claim_status": new_claim.status,
        "claim_id": new_claim.id,
        "user_has_claimed": True,
        "user_claim_status": new_claim.status,
        "photo_path": report.photo_path,
        "identifying_details": report.identifying_details,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
    }


@router.post("/{report_id}/recover", response_model=ReportResponse)
def mark_report_recovered(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-LOST-05 & FR-RECOVER-01: Owner marks a lost report as Recovered.
    If a finder notice was submitted, requires Admin approval before recovery can be confirmed.
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

    # Check for claims on this report
    claims = db.query(Claim).filter(Claim.report_id == report.id).all()
    approved_claim = None
    for c in claims:
        if c.status in [
            ClaimStatus.SUBMITTED.value,
            ClaimStatus.UNDER_REVIEW.value,
            ClaimStatus.AWAITING_INFO.value,
        ]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot mark item as recovered while a found notice is pending admin verification. Please wait for an administrator to approve the match.",
            )
        if c.status == ClaimStatus.APPROVED.value:
            approved_claim = c

    report.status = ReportStatus.RECOVERED.value
    report.possession_status = PossessionStatus.RETURNED.value
    report.updated_at = datetime.now(timezone.utc)

    handover_notes = "Marked as recovered directly by owner."
    if approved_claim:
        approved_claim.status = ClaimStatus.COMPLETED.value
        approved_claim.updated_at = datetime.now(timezone.utc)
        handover_notes = f"Item recovered from founder #{approved_claim.claimant_id} after admin approval of Claim #{approved_claim.id}."
    elif report.founder_id:
        handover_notes = f"Item recovered directly from founder #{report.founder_id} by owner #{report.owner_id}."

    # Create RecoveryRecord (FR-RECOVER-01)
    recovery_rec = RecoveryRecord(
        report_id=report.id,
        claim_id=approved_claim.id if approved_claim else None,
        responsible_user_id=current_user.id,
        handover_notes=handover_notes,
    )
    db.add(recovery_rec)

    # Log audit entry (FR-AUDIT-01)
    log_audit(
        db=db,
        action="ITEM_RECOVERED",
        target_type="report",
        target_id=report.id,
        actor_id=current_user.id,
        details=f"Report #{report.id} ({report.title}) marked as recovered by owner #{current_user.id}",
    )

    db.commit()
    db.refresh(report)

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
        "possession_status": report.possession_status,
        "custody_location": report.custody_location,
        "founder_id": report.founder_id,
        "found_notes": report.found_notes,
        "founder": report.founder,
        "claim_status": approved_claim.status if approved_claim else None,
        "claim_id": approved_claim.id if approved_claim else None,
        "photo_path": report.photo_path,
        "identifying_details": report.identifying_details,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
    }
