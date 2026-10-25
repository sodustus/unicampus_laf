from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from collections import defaultdict
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
    HandoverFailureRequest,
)
from app.core.dependencies import get_current_user, require_admin
from app.models.recovery import RecoveryRecord
from app.services.audit import log_audit

router = APIRouter(tags=["Claims & Verification"])


def attach_queue_positions(db: Session, claims: List[Claim]) -> List[Claim]:
    """
    Computes First-Come, First-Served queue position for active claims on each report.
    Active queue statuses: SUBMITTED, UNDER_REVIEW, AWAITING_INFO, APPROVED.
    Also handles multi-claim suspension: if one claim on a report is APPROVED,
    all other active claims on that report are marked is_suspended=True.
    Optimized: batch-fetches all active claims for the involved reports in a single query.
    """
    report_ids = {c.report_id for c in claims if c}
    if not report_ids:
        return claims

    # Find reports with an active approved claim
    approved_claims = (
        db.query(Claim)
        .filter(
            Claim.report_id.in_(report_ids),
            Claim.status == ClaimStatus.APPROVED.value,
        )
        .all()
    )
    approved_by_report = {ac.report_id: ac.id for ac in approved_claims}

    all_active_claims = (
        db.query(Claim)
        .filter(
            Claim.report_id.in_(report_ids),
            Claim.status.in_([
                ClaimStatus.SUBMITTED.value,
                ClaimStatus.UNDER_REVIEW.value,
                ClaimStatus.AWAITING_INFO.value,
                ClaimStatus.APPROVED.value,
            ]),
        )
        .order_by(Claim.report_id.asc(), Claim.created_at.asc(), Claim.id.asc())
        .all()
    )

    report_queues = defaultdict(list)
    for ac in all_active_claims:
        report_queues[ac.report_id].append(ac)

    queue_map = {}
    for r_id, r_claims in report_queues.items():
        for idx, ac in enumerate(r_claims, start=1):
            queue_map[ac.id] = idx

    for c in claims:
        if c:
            c.queue_position = queue_map.get(c.id, None)
            approved_claim_id = approved_by_report.get(c.report_id)
            if (
                approved_claim_id
                and c.id != approved_claim_id
                and c.status not in [ClaimStatus.REJECTED.value, ClaimStatus.COMPLETED.value]
            ):
                c.is_suspended = True
                c.suspended_reason = f"Suspended temporarily: Claim #{approved_claim_id} is currently approved and in handover verification."
            else:
                c.is_suspended = False
                c.suspended_reason = None

    return claims


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

    if report.owner_id == current_user.id or report.founder_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot submit a claim on an item you registered. A user cannot be both the reporter and claimer on the same report.",
        )

    # Rule: A person cannot claim twice WHILE THEIR CLAIM IS BEING PROCESSED
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
            detail="You already have an ownership claim currently being processed for this item. You cannot claim an item twice while your claim is under review.",
        )

    # Rule: An item cannot be claimed if an active approved claim is undergoing handover
    has_approved_claim = (
        db.query(Claim)
        .filter(
            Claim.report_id == report_id,
            Claim.status == ClaimStatus.APPROVED.value,
        )
        .first()
    )
    if has_approved_claim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This item currently has an approved claim (#{has_approved_claim.id}) undergoing handover. New claims cannot be submitted unless the active handover fails or is rejected.",
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

    return attach_queue_positions(db, [new_claim])[0]


@router.get("/claims/mine", response_model=List[ClaimResponse])
def get_my_claims(
    scope: str = Query("filed", description="'filed' for claims submitted by user, or 'all' for all claims involving user"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    FR-CLAIM-09: Claimant views status and history of claims they submitted (or all involving handovers).
    """
    query = (
        db.query(Claim)
        .options(
            joinedload(Claim.report),
            joinedload(Claim.claimant),
            joinedload(Claim.reviewer),
            joinedload(Claim.verification_record),
            joinedload(Claim.recovery_record),
        )
        .join(Report, Claim.report_id == Report.id)
    )
    if scope == "all":
        query = query.filter(
            (Claim.claimant_id == current_user.id)
            | (Report.owner_id == current_user.id)
            | (Report.founder_id == current_user.id)
        )
    else:
        # Default 'filed': only claims initiated by user (claiming a found item or lost item handshake)
        query = query.filter(Claim.claimant_id == current_user.id)

    claims = query.order_by(Claim.created_at.desc()).all()
    return attach_queue_positions(db, claims)


@router.get("/claims", response_model=List[ClaimResponse])
def get_all_claims(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Admin-only: View pending claims and verification requests.
    """
    query = db.query(Claim).options(
        joinedload(Claim.report),
        joinedload(Claim.claimant),
        joinedload(Claim.reviewer),
        joinedload(Claim.verification_record),
        joinedload(Claim.recovery_record),
    )
    if status_filter and status_filter.lower() != "all":
        query = query.filter(Claim.status == status_filter.lower())
    claims = query.order_by(Claim.created_at.desc()).all()
    for c in claims:
        c.is_admin_view = True
    return attach_queue_positions(db, claims)


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

    if is_admin:
        claim.is_admin_view = True
    return attach_queue_positions(db, [claim])[0]


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
        if claim.report:
            claim.report.status = ReportStatus.ACTIVE.value

    elif target_status == ClaimStatus.APPROVED.value:
        existing_approved = (
            db.query(Claim)
            .filter(
                Claim.report_id == claim.report_id,
                Claim.id != claim.id,
                Claim.status == ClaimStatus.APPROVED.value,
            )
            .first()
        )
        if existing_approved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another claim (#{existing_approved.id}) is already approved for this item. Only one claim can be approved at a time.",
            )

    elif target_status == ClaimStatus.HANDOVER_FAILED.value:
        claim.claimant_handover_failed = True
        claim.finder_handover_failed = True
        if status_update.rejection_reason:
            claim.rejection_reason = status_update.rejection_reason.strip()
            claim.handover_failure_notes = status_update.rejection_reason.strip()

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
    claim.is_admin_view = True
    return attach_queue_positions(db, [claim])[0]


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
    return attach_queue_positions(db, [claim])[0]


@router.post("/claims/{claim_id}/confirm-receipt", response_model=ClaimResponse)
def confirm_claim_receipt(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Owner (claimant on found report, or reporter on lost report) confirms physical receipt of the item.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    if claim.status != ClaimStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Receipt can only be confirmed for approved claims.",
        )

    is_owner = claim.owner and claim.owner.id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN.value
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the verified owner of the item (or an administrator) can confirm physical receipt.",
        )

    claim.owner_confirmed_receipt = True
    claim.updated_at = datetime.now(timezone.utc)

    log_audit(
        db=db,
        action="HANDOVER_RECEIPT_CONFIRMED_BY_OWNER",
        target_type="claim",
        target_id=claim.id,
        actor_id=current_user.id,
        details=f"Item receipt confirmed by user #{current_user.id} ({current_user.full_name or current_user.email}) for claim #{claim.id} on report #{claim.report_id}. Pending administrator final verification.",
    )

    db.commit()
    db.refresh(claim)
    if is_admin:
        claim.is_admin_view = True
    return attach_queue_positions(db, [claim])[0]


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

    # FR-CLAIM-06 Rule: Admin can complete exchange only AFTER owner confirms they have received property
    if not claim.owner_confirmed_receipt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot complete handover exchange: The owner must confirm physical receipt of their property before administrator completion.",
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

        # Reject any other active/competing claims on this report because the item is now recovered
        other_active_claims = (
            db.query(Claim)
            .filter(
                Claim.report_id == report.id,
                Claim.id != claim.id,
                Claim.status.in_([
                    ClaimStatus.SUBMITTED.value,
                    ClaimStatus.UNDER_REVIEW.value,
                    ClaimStatus.AWAITING_INFO.value,
                    ClaimStatus.APPROVED.value,
                ]),
            )
            .all()
        )
        for oac in other_active_claims:
            oac.status = ClaimStatus.REJECTED.value
            oac.rejection_reason = f"Item recovered and returned to verified owner under claim #{claim.id}."
            oac.updated_at = datetime.now(timezone.utc)

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
    claim.is_admin_view = True
    return attach_queue_positions(db, [claim])[0]


@router.post("/claims/{claim_id}/flag-handover-failed", response_model=ClaimResponse)
def flag_handover_failed(
    claim_id: int,
    fail_in: HandoverFailureRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Parties flag that the physical handover failed (item was mismatched, damaged, or not theirs).
    Once both parties (or an admin) confirm, claim status transitions to 'handover_failed'.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    if claim.status not in [ClaimStatus.APPROVED.value, ClaimStatus.UNDER_REVIEW.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot flag handover failure on claim in '{claim.status}' state.",
        )

    is_claimant = claim.claimant_id == current_user.id
    is_report_owner = claim.report and claim.report.owner_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN.value

    if not (is_claimant or is_report_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to flag this handover.",
        )

    actor_role = "Admin" if is_admin else ("Claimant" if is_claimant else "Custodian/Finder")
    note_line = f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}] {actor_role} ({current_user.email}): {fail_in.reason.strip()}"
    if claim.handover_failure_notes:
        claim.handover_failure_notes += f"\n{note_line}"
    else:
        claim.handover_failure_notes = note_line

    if is_admin:
        claim.claimant_handover_failed = True
        claim.finder_handover_failed = True
    elif is_claimant:
        claim.claimant_handover_failed = True
    elif is_report_owner:
        claim.finder_handover_failed = True

    # Check for mutual confirmation
    if claim.claimant_handover_failed and claim.finder_handover_failed:
        claim.status = ClaimStatus.HANDOVER_FAILED.value
        claim.rejection_reason = f"Handover failed: {fail_in.reason.strip()}"
        log_audit(
            db=db,
            action="HANDOVER_FAILED_MUTUAL",
            target_type="claim",
            target_id=claim.id,
            actor_id=current_user.id,
            details=f"Both parties confirmed handover failure for Claim #{claim.id}",
        )
    else:
        log_audit(
            db=db,
            action="HANDOVER_MISMATCH_FLAGGED",
            target_type="claim",
            target_id=claim.id,
            actor_id=current_user.id,
            details=f"{actor_role} flagged handover mismatch for Claim #{claim.id}",
        )

    claim.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(claim)
    return attach_queue_positions(db, [claim])[0]


@router.post("/claims/{claim_id}/repost-report", response_model=ClaimResponse)
def repost_report_after_handover_failure(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin or Report Owner: Repost/reactivate report for new claims after a failed handover or rejected claim.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    report = claim.report
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated report not found.")

    is_admin = current_user.role == UserRole.ADMIN.value
    is_owner = report.owner_id == current_user.id

    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to reactivate this report.",
        )

    report.status = ReportStatus.ACTIVE.value
    if report.type == ReportType.LOST.value:
        report.founder_id = None
        report.possession_status = PossessionStatus.LOST_UNKNOWN.value
        report.custody_location = None
        report.found_notes = None

    report.updated_at = datetime.now(timezone.utc)

    actor_label = "Admin" if is_admin else "Report Owner"
    log_audit(
        db=db,
        action="REPORT_REPOSTED",
        target_type="report",
        target_id=report.id,
        actor_id=current_user.id,
        details=f"Report #{report.id} ({report.title}) reposted for new claims after Claim #{claim.id} failed by {actor_label} ({current_user.email}).",
    )
    db.commit()
    db.refresh(claim)
    return attach_queue_positions(db, [claim])[0]
