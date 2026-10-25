from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
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
