from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.claim import Claim, ClaimStatus, VerificationRecord
from app.models.report import Report, ReportType, ReportStatus, PossessionStatus
from app.models.user import User, UserRole
from app.schemas.claim import (
    ClaimCreate,
    ClaimStatusUpdate,
    ClaimRespondInfo,
    ClaimResponse,
)
from app.core.dependencies import get_current_user, require_admin
from app.models.recovery import RecoveryRecord
from app.services.audit import log_audit

router = APIRouter(tags=["Claims & Verification"])


@router.post("/reports/{report_id}/claims", response_model=ClaimResponse, status_code=status.HTTP_201_CREATED)
def submit_claim(
    report_id: int,
    claim_in: ClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-CLAIM-01 & FR-CLAIM-02: Submit ownership claim with proof on an Active found report.
    """
    report = db.query(Report).filter(Report.id == report_id, Report.deleted_at.is_(None)).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    if report.type != ReportType.FOUND.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claims can only be filed against 'found' item reports.",
        )

    if report.status != ReportStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This found item is no longer active for claims.",
        )

    if report.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot submit a claim on an item you registered as found.",
        )

    # Check for existing active claim by this user
    active_claim = (
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
    if active_claim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active claim pending review on this item.",
        )

    new_claim = Claim(
        report_id=report_id,
        claimant_id=current_user.id,
        status=ClaimStatus.SUBMITTED.value,
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)

    # Attach verification record (FR-CLAIM-02)
    verification = VerificationRecord(
        claim_id=new_claim.id,
        proof_details=claim_in.proof_details.strip(),
    )
    db.add(verification)
    db.commit()
    db.refresh(new_claim)

    # Log audit entry
    log_audit(
        db=db,
        action="CLAIM_SUBMITTED",
        target_type="claim",
        target_id=new_claim.id,
        actor_id=current_user.id,
        details=f"Claim submitted for report #{report.id} ({report.title})",
    )
    db.commit()

    return new_claim


@router.get("/claims/mine", response_model=List[ClaimResponse])
def get_my_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-CLAIM-09: Claimant views status and history of claims they submitted or received on their reports.
    """
    return (
        db.query(Claim)
        .join(Report, Claim.report_id == Report.id)
        .filter(
            (Claim.claimant_id == current_user.id) | (Report.owner_id == current_user.id)
        )
        .order_by(Claim.created_at.desc())
        .all()
    )


@router.get("/claims", response_model=List[ClaimResponse])
def get_all_claims(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Admin-only: View pending claims and verification requests.
    """
    query = db.query(Claim)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(Claim.status == status_filter.lower())
    return query.order_by(Claim.created_at.desc()).all()


@router.get("/claims/{claim_id}", response_model=ClaimResponse)
def get_claim_detail(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-CLAIM-08: Verification details visible only to claimant, report owner, and authorized admin reviewers.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    is_claimant = claim.claimant_id == current_user.id
    is_report_owner = claim.report and claim.report.owner_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN.value

    if not (is_claimant or is_report_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this claim's verification proof.",
        )

    return claim


@router.patch("/claims/{claim_id}", response_model=ClaimResponse)
def update_claim_status(
    claim_id: int,
    status_update: ClaimStatusUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    FR-CLAIM-04 & FR-CLAIM-05: Admin reviews, requests info, approves, or rejects claim.
    §6.2: Rejected and Completed are the only end states.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    if claim.status in [ClaimStatus.REJECTED.value, ClaimStatus.COMPLETED.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Claim is in end state '{claim.status}' and cannot be transitioned further.",
        )

    target_status = status_update.status

    # FR-CLAIM-05: Rejection requires a recorded reason
    if target_status == ClaimStatus.REJECTED.value:
        if not status_update.rejection_reason or not status_update.rejection_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A rejection reason must be recorded when rejecting a claim.",
            )
        claim.rejection_reason = status_update.rejection_reason.strip()

        # If claim on a lost report is rejected, release the report from the unverified finder
        if claim.report and claim.report.type == ReportType.LOST.value:
            claim.report.founder_id = None
            claim.report.possession_status = PossessionStatus.LOST_UNKNOWN.value
            claim.report.custody_location = None
            claim.report.found_notes = None

    claim.status = target_status
    claim.reviewer_id = admin_user.id
    claim.updated_at = datetime.now(timezone.utc)

    # Log audit entry
    log_audit(
        db=db,
        action=f"CLAIM_{target_status.upper()}",
        target_type="claim",
        target_id=claim.id,
        actor_id=admin_user.id,
        details=status_update.rejection_reason or f"Status changed to {target_status}",
    )

    db.commit()
    db.refresh(claim)
    return claim


@router.post("/claims/{claim_id}/respond", response_model=ClaimResponse)
def respond_to_information_request(
    claim_id: int,
    response_in: ClaimRespondInfo,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    §6.2 Loop: Claimant provides additional proof; loops claim from 'awaiting_info' back to 'under_review'.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    if claim.claimant_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the claimant can provide requested verification info.",
        )

    if claim.status != ClaimStatus.AWAITING_INFO.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This claim is not currently awaiting additional information.",
        )

    # Update verification record with claimant's response
    verification = claim.verification_record
    if verification:
        verification.additional_info = response_in.additional_info.strip()

    # §6.2 Loop transition: returns to Under Review for administrator decision
    claim.status = ClaimStatus.UNDER_REVIEW.value
    claim.updated_at = datetime.now(timezone.utc)

    # Log audit entry
    log_audit(
        db=db,
        action="CLAIM_INFO_PROVIDED",
        target_type="claim",
        target_id=claim.id,
        actor_id=current_user.id,
        details="Claimant submitted requested additional verification details",
    )

    db.commit()
    db.refresh(claim)
    return claim


@router.post("/claims/{claim_id}/complete", response_model=ClaimResponse)
def complete_claim_handover(
    claim_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    FR-CLAIM-06 & FR-CLAIM-07: Admin confirms handover; moves claim to Completed,
    and cascades found-item report status to Recovered.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    if claim.status != ClaimStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A claim must be in 'approved' status before confirming handover completion.",
        )

    # 1. Complete claim
    claim.status = ClaimStatus.COMPLETED.value
    claim.reviewer_id = admin_user.id
    claim.updated_at = datetime.now(timezone.utc)

    # 2. FR-CLAIM-07 & FR-RECOVER-01: Cascade report to Recovered
    report = claim.report
    if report:
        report.status = ReportStatus.RECOVERED.value
        report.possession_status = PossessionStatus.RETURNED.value
        report.updated_at = datetime.now(timezone.utc)

        # Create RecoveryRecord (FR-RECOVER-01)
        recovery_rec = RecoveryRecord(
            report_id=report.id,
            claim_id=claim.id,
            responsible_user_id=admin_user.id,
            handover_notes="Handover confirmed by administrator upon verified ownership proof.",
        )
        db.add(recovery_rec)

        # Audit logs for both claim completion and report recovery
        log_audit(
            db=db,
            action="CLAIM_COMPLETED",
            target_type="claim",
            target_id=claim.id,
            actor_id=admin_user.id,
            details=f"Item handover completed for report #{report.id}",
        )
        log_audit(
            db=db,
            action="ITEM_RECOVERED",
            target_type="report",
            target_id=report.id,
            actor_id=admin_user.id,
            details=f"Report #{report.id} ({report.title}) marked as recovered via claim #{claim.id}",
        )

    db.commit()
    db.refresh(claim)
    return claim
