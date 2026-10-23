from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    target_type: Optional[str] = Query(None, description="Filter by target type (report, claim, user)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    FR-AUDIT-05: Audit records are readable only by administrators.
    Returns immutable system audit entries sorted newest first.
    """
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)

    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    # Enrich with actor_email
    results = []
    for log in logs:
        actor_email = log.actor.email if log.actor else "System"
        results.append(
            AuditLogResponse(
                id=log.id,
                actor_id=log.actor_id,
                actor_email=actor_email,
                action=log.action,
                target_type=log.target_type,
                target_id=log.target_id,
                details=log.details,
                created_at=log.created_at,
            )
        )

    return results
