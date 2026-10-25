from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.models.report import Report, ReportStatus
from app.models.claim import Claim
from app.schemas.dashboard import AdminUserItem
from app.schemas.report import ReportResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/admin", tags=["Administrator Management"])


@router.get("/users", response_model=List[AdminUserItem])
def list_campus_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    FR-DASH-A-04: View campus accounts, active statuses, roles, and activity totals.
    """
    # Batch aggregation for report and claim counts to prevent N+1 queries
    report_counts = dict(
        db.query(Report.owner_id, func.count(Report.id))
        .filter(Report.deleted_at.is_(None))
        .group_by(Report.owner_id)
        .all()
    )
    claim_counts = dict(
        db.query(Claim.claimant_id, func.count(Claim.id))
        .group_by(Claim.claimant_id)
        .all()
    )

    users = db.query(User).order_by(User.created_at.desc()).all()
    user_items = [
        AdminUserItem(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            department=u.department,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
            reports_count=report_counts.get(u.id, 0),
            claims_count=claim_counts.get(u.id, 0),
        )
        for u in users
    ]
    return user_items


@router.patch("/users/{user_id}/toggle-active")
def toggle_user_active_status(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    FR-DASH-A-04 & FR-AUDIT-01: Activate or deactivate abusive accounts.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    user.is_active = not user.is_active
    action_name = "USER_ACTIVATED" if user.is_active else "USER_DEACTIVATED"

    log_audit(
        db=db,
        action=action_name,
        target_type="user",
        target_id=user.id,
        actor_id=admin_user.id,
        details=f"User {user.email} status changed to {'active' if user.is_active else 'inactive'}",
    )

    db.commit()
    db.refresh(user)
    return {
        "message": f"User {user.email} is now {'active' if user.is_active else 'deactivated'}.",
        "is_active": user.is_active,
    }


@router.patch("/reports/{report_id}/moderate", response_model=ReportResponse)
def moderate_report(
    report_id: int,
    status_val: str = Body(..., embed=True),
    moderation_reason: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    FR-DASH-A-03: Moderate or take down reports violating campus policies.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    old_status = report.status
    report.status = status_val
    report.updated_at = datetime.now(timezone.utc)

    if status_val == ReportStatus.CLOSED.value:
        report.deleted_at = datetime.now(timezone.utc)

    log_audit(
        db=db,
        action="REPORT_MODERATED",
        target_type="report",
        target_id=report.id,
        actor_id=admin_user.id,
        details=f"Status changed from {old_status} to {status_val}. Reason: {moderation_reason}",
    )

    db.commit()
    db.refresh(report)
    return report


@router.delete("/reports/{report_id}/permanent")
def permanent_delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    FR-AUDIT-04: Permanent data removal (restricted administrative operation).
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    title = report.title
    db.delete(report)

    log_audit(
        db=db,
        action="REPORT_PURGED",
        target_type="report",
        target_id=report_id,
        actor_id=admin_user.id,
        details=f"Report #{report_id} ('{title}') permanently purged from database.",
    )

    db.commit()
    return {"message": f"Report #{report_id} permanently removed."}


@router.get("/users/{user_id}/activity")
def get_user_activity(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Admin User Activity Inspection:
    Returns target user profile, all reports posted by this user, and all claims involving this user.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # 1. Reports posted by this user
    reports = (
        db.query(Report)
        .options(joinedload(Report.category))
        .filter(Report.owner_id == target_user.id)
        .order_by(Report.created_at.desc())
        .all()
    )

    reports_data = [
        {
            "id": r.id,
            "type": r.type,
            "title": r.title,
            "description": r.description,
            "category": r.category.name if r.category else "General",
            "location": r.location,
            "item_date": r.item_date.isoformat() if r.item_date else None,
            "status": r.status,
            "possession_status": r.possession_status,
            "custody_location": r.custody_location,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "deleted_at": r.deleted_at.isoformat() if r.deleted_at else None,
        }
        for r in reports
    ]

    # 2. Claims involving this user
    claims = (
        db.query(Claim)
        .options(
            joinedload(Claim.report),
            joinedload(Claim.claimant),
            joinedload(Claim.verification_record),
        )
        .join(Report, Claim.report_id == Report.id)
        .filter(
            (Claim.claimant_id == target_user.id)
            | (Report.owner_id == target_user.id)
        )
        .order_by(Claim.created_at.desc())
        .all()
    )

    claims_data = [
        {
            "id": c.id,
            "report_id": c.report_id,
            "report_title": c.report.title if c.report else f"Report #{c.report_id}",
            "report_type": c.report.type if c.report else "unknown",
            "report_location": c.report.location if c.report else "Unknown",
            "is_claimant": c.claimant_id == target_user.id,
            "role_in_claim": "Claimant / Finder" if c.claimant_id == target_user.id else "Item Reporter",
            "claimant_name": c.claimant.full_name or c.claimant.email if c.claimant else "Unknown",
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "proof_details": c.verification_record.proof_details if c.verification_record else None,
            "additional_info": c.verification_record.additional_info if c.verification_record else None,
            "rejection_reason": c.rejection_reason,
        }
        for c in claims
    ]

    return {
        "user": {
            "id": target_user.id,
            "email": target_user.email,
            "full_name": target_user.full_name,
            "department": target_user.department,
            "phone_number": target_user.phone_number,
            "role": target_user.role,
            "is_active": target_user.is_active,
            "created_at": target_user.created_at.isoformat() if target_user.created_at else None,
            "reports_count": len(reports_data),
            "claims_count": len([c for c in claims_data if c["is_claimant"]]),
        },
        "reports": reports_data,
        "claims": claims_data,
    }
