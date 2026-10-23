import json
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog


def log_audit(
    db: Session,
    action: str,
    target_type: str,
    target_id: Optional[int] = None,
    actor_id: Optional[int] = None,
    details: Optional[Any] = None,
) -> AuditLog:
    """
    Creates an immutable audit log entry (FR-AUDIT-01, FR-AUDIT-02).
    Every major state change or critical operation generates exactly one row.
    """
    details_str = None
    if details is not None:
        if isinstance(details, (dict, list)):
            details_str = json.dumps(details, default=str)
        else:
            details_str = str(details)

    audit_entry = AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details_str,
    )
    db.add(audit_entry)
    db.flush()
    return audit_entry
