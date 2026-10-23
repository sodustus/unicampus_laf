from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.report import Report, ReportType, ReportStatus
from app.models.claim import Claim, ClaimStatus
from app.models.audit import AuditLog
from app.schemas.dashboard import (
    UserDashboardResponse,
    UserDashboardStats,
    AdminDashboardResponse,
    AdminDashboardStats,
)
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboards"])


@router.get("/user", response_model=UserDashboardResponse)
def get_user_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-DASH-U-01, FR-DASH-U-02, FR-DASH-U-03:
    Personalized student/staff portal showing active reports, recovered items,
    claims tracker, and summary statistics.
    """
    # Active reports posted by user
    active_reports = (
        db.query(Report)
        .filter(
            Report.owner_id == current_user.id,
            Report.deleted_at.is_(None),
            Report.status == ReportStatus.ACTIVE.value,
        )
        .order_by(Report.created_at.desc())
        .all()
    )

    # Recovered or closed reports posted by user
    recovered_reports = (
        db.query(Report)
        .filter(
            Report.owner_id == current_user.id,
            Report.deleted_at.is_(None),
            Report.status.in_([ReportStatus.RECOVERED.value, ReportStatus.CLOSED.value]),
        )
        .order_by(Report.created_at.desc())
        .all()
    )

    # Claims filed by user
    my_claims = (
        db.query(Claim)
        .filter(Claim.claimant_id == current_user.id)
        .order_by(Claim.created_at.desc())
        .all()
    )

    # Action required claims (e.g. admin requested more info)
    action_required_count = sum(
        1 for c in my_claims if c.status == ClaimStatus.AWAITING_INFO.value
    )

    stats = UserDashboardStats(
        active_reports_count=len(active_reports),
        recovered_reports_count=len(recovered_reports),
        total_claims_count=len(my_claims),
        action_required_claims_count=action_required_count,
    )

    return UserDashboardResponse(
        stats=stats,
        active_reports=active_reports,
        recovered_reports=recovered_reports,
        my_claims=my_claims,
    )


@router.get("/admin", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    FR-DASH-A-01, FR-DASH-A-02, FR-DASH-A-06:
    Administrator cockpit showing inventory stats, pending claims review queue,
    and recent immutable audit activities.
    """
    # Total reports (non-deleted)
    total_reports = db.query(Report).filter(Report.deleted_at.is_(None)).count()
    lost_reports = (
        db.query(Report)
        .filter(Report.deleted_at.is_(None), Report.type == ReportType.LOST.value)
        .count()
    )
    found_reports = (
        db.query(Report)
        .filter(Report.deleted_at.is_(None), Report.type == ReportType.FOUND.value)
        .count()
    )
    active_reports = (
        db.query(Report)
        .filter(Report.deleted_at.is_(None), Report.status == ReportStatus.ACTIVE.value)
        .count()
    )
    recovered_reports = (
        db.query(Report)
        .filter(Report.deleted_at.is_(None), Report.status == ReportStatus.RECOVERED.value)
        .count()
    )

    recovery_rate = (
        round((recovered_reports / total_reports) * 100, 1) if total_reports > 0 else 0.0
    )

    total_users = db.query(User).count()

    # Pending claims count
    pending_statuses = [
        ClaimStatus.SUBMITTED.value,
        ClaimStatus.UNDER_REVIEW.value,
        ClaimStatus.AWAITING_INFO.value,
    ]
    pending_claims_query = (
        db.query(Claim)
        .filter(Claim.status.in_(pending_statuses))
        .order_by(Claim.created_at.desc())
    )
    pending_claims = pending_claims_query.limit(20).all()
    pending_claims_count = db.query(Claim).filter(Claim.status.in_(pending_statuses)).count()

    stats = AdminDashboardStats(
        total_reports=total_reports,
        lost_reports=lost_reports,
        found_reports=found_reports,
        active_reports=active_reports,
        recovered_reports=recovered_reports,
        recovery_rate_percent=recovery_rate,
        total_users=total_users,
        pending_claims=pending_claims_count,
    )

    # Recent activity from audit log
    recent_logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(20)
        .all()
    )

    recent_activity = [
        AuditLogResponse(
            id=l.id,
            actor_id=l.actor_id,
            actor_email=l.actor.email if l.actor else "System",
            action=l.action,
            target_type=l.target_type,
            target_id=l.target_id,
            details=l.details,
            created_at=l.created_at,
        )
        for l in recent_logs
    ]

    return AdminDashboardResponse(
        stats=stats,
        pending_claims=pending_claims,
        recent_activity=recent_activity,
    )
