from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.report import Report, ReportStatus
from app.models.recovery import RecoveryRecord
from app.schemas.recovery import RecoveryRecordCreate, RecoveryRecordResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/recovery", tags=["recovery"])


@router.post("/direct/{report_id}", response_model=RecoveryRecordResponse)
def direct_recovery(
    report_id: int,
    recovery_in: RecoveryRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-RECOVER-01: An owner marks their lost item as Recovered, creating a recovery record.
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

    # Transition report status
    report.status = ReportStatus.RECOVERED.value
    report.updated_at = datetime.now(timezone.utc)

    # Create RecoveryRecord
    record = RecoveryRecord(
        report_id=report.id,
        claim_id=None,
        responsible_user_id=current_user.id,
        handover_notes=recovery_in.handover_notes or "Marked recovered directly by owner.",
    )
    db.add(record)

    # Log audit entry
    log_audit(
        db=db,
        action="ITEM_RECOVERED",
        target_type="report",
        target_id=report.id,
        actor_id=current_user.id,
        details=f"Item recovered directly: {recovery_in.handover_notes or 'Direct recovery'}",
    )

    db.commit()
    db.refresh(record)
    return record


@router.get("/report/{report_id}", response_model=RecoveryRecordResponse)
def get_recovery_for_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-RECOVER-03: View recovery record for a recovered report.
    Accessible by report owner, responsible user, or admin.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    record = db.query(RecoveryRecord).filter(RecoveryRecord.report_id == report_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No recovery record exists for this report.",
        )

    is_owner = report.owner_id == current_user.id
    is_responsible = record.responsible_user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN.value

    if not (is_owner or is_responsible or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this recovery record.",
        )

    return record
