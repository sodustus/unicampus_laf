import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone
from app.main import app
from app.db.session import SessionLocal
from app.models.category import Category
from app.models.report import Report, ReportType, ReportStatus
from app.models.claim import Claim, ClaimStatus
from app.models.user import User

client = TestClient(app)


def get_token(email: str, password: str) -> str:
    res = client.post("/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def test_admin_delete_duplicate_and_restore_rollback():
    """
    Feature 1: Admin delete duplicate reports with reason,
    querying soft-deleted reports, and 1-click rollback / restore.
    """
    admin_token = get_token("admin@campus.edu", "admin123")
    student_token = get_token("abebebikila@campus.edu", "password123")

    db = SessionLocal()
    cat = db.query(Category).first()
    category_id = cat.id
    db.close()

    # Create a test report
    rep_res = client.post(
        "/reports",
        json={
            "type": "found",
            "title": "Duplicate Sony Headphones WH-1000XM4",
            "description": "Black noise cancelling headphones in Library",
            "category_id": category_id,
            "location": "Library Floor 2",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert rep_res.status_code == 201
    report_id = rep_res.json()["id"]

    # Student cannot view deleted reports -> 403
    del_query_student = client.get(
        "/reports?status=deleted",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert del_query_student.status_code == 403

    # Admin deletes the report as duplicate with reason
    del_res = client.request(
        "DELETE",
        f"/reports/{report_id}",
        json={"reason": "Duplicate of report #42 submitted earlier"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_res.status_code == 200
    assert "deleted successfully" in del_res.json()["message"]

    # Verify report is soft-deleted and reason recorded
    db = SessionLocal()
    deleted_report = db.query(Report).filter(Report.id == report_id).first()
    assert deleted_report.deleted_at is not None
    assert deleted_report.status == ReportStatus.CLOSED.value
    assert deleted_report.deletion_reason == "Duplicate of report #42 submitted earlier"
    db.close()

    # Admin can view soft-deleted reports
    del_query_admin = client.get(
        "/reports?status=deleted",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_query_admin.status_code == 200
    deleted_items = del_query_admin.json()
    assert any(item["id"] == report_id for item in deleted_items)

    # Rollback / Restore the report
    restore_res = client.post(
        f"/reports/{report_id}/restore",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["status"] == "active"
    assert restore_res.json()["deleted_at"] is None

    # Verify restored report is active again
    db = SessionLocal()
    restored_report = db.query(Report).filter(Report.id == report_id).first()
    assert restored_report.deleted_at is None
    assert restored_report.status == ReportStatus.ACTIVE.value
    assert restored_report.deletion_reason is None
    db.close()


def test_multiple_claimers_priority_queue_and_promotion():
    """
    Feature 4 & 3: Multiple claimers first-come, first-served queue (Queue #1, Queue #2).
    Admin checks ownership proof (hidden from public) and rejects claim #1,
    which automatically promotes claim #2 to Priority #1.
    """
    admin_token = get_token("admin@campus.edu", "admin123")

    # Register claimer 1, claimer 2, and finder
    client.post(
        "/auth/register",
        json={"email": "queue_finder@campus.edu", "password": "FinderPass2026!"},
    )
    client.post(
        "/auth/register",
        json={"email": "claimer_one@campus.edu", "password": "ClaimerPass2026!"},
    )
    client.post(
        "/auth/register",
        json={"email": "claimer_two@campus.edu", "password": "ClaimerPass2026!"},
    )

    finder_token = get_token("queue_finder@campus.edu", "FinderPass2026!")
    c1_token = get_token("claimer_one@campus.edu", "ClaimerPass2026!")
    c2_token = get_token("claimer_two@campus.edu", "ClaimerPass2026!")

    db = SessionLocal()
    cat = db.query(Category).first()
    category_id = cat.id
    db.close()

    # Finder submits a found laptop report
    rep_res = client.post(
        "/reports",
        json={
            "type": "found",
            "title": "MacBook Pro 14 Space Gray",
            "description": "Found on 3rd floor study pod",
            "category_id": category_id,
            "location": "Library Study Pod 302",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {finder_token}"},
    )
    report_id = rep_res.json()["id"]

    # Claimer 1 claims first
    c1_res = client.post(
        f"/reports/{report_id}/claims",
        json={"proof_details": "Serial ending in 9871 with sticker of GitHub Octocat"},
        headers={"Authorization": f"Bearer {c1_token}"},
    )
    assert c1_res.status_code == 201
    claim1_id = c1_res.json()["id"]
    assert c1_res.json()["queue_position"] == 1

    # Claimer 2 claims second
    c2_res = client.post(
        f"/reports/{report_id}/claims",
        json={"proof_details": "Serial ending in 4421, small scratch on top lid"},
        headers={"Authorization": f"Bearer {c2_token}"},
    )
    assert c2_res.status_code == 201
    claim2_id = c2_res.json()["id"]
    assert c2_res.json()["queue_position"] == 2

    # Fetch admin claims list and verify positions
    admin_claims = client.get(
        "/claims",
        headers={"Authorization": f"Bearer {admin_token}"},
    ).json()

    c1_admin = next(c for c in admin_claims if c["id"] == claim1_id)
    c2_admin = next(c for c in admin_claims if c["id"] == claim2_id)
    assert c1_admin["queue_position"] == 1
    assert c2_admin["queue_position"] == 2

    # Admin reviews and rejects Claimer 1 with a reason
    reject_res = client.patch(
        f"/claims/{claim1_id}",
        json={"status": "rejected", "rejection_reason": "Serial number does not match device BIOS"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "rejected"
    assert reject_res.json()["queue_position"] is None

    # Claimer 2 is now automatically promoted to Priority #1 in the queue!
    c2_my = client.get(
        "/claims/mine",
        headers={"Authorization": f"Bearer {c2_token}"},
    ).json()
    c2_claim = next(c for c in c2_my if c["id"] == claim2_id)
    assert c2_claim["queue_position"] == 1


def test_mutual_handover_failure_and_repost():
    """
    Feature 2: What happens if handovers fail (physical item mismatch when owner meets finder).
    Both parties confirm handover failure -> transitions to handover_failed.
    Admin can then reactivate / repost the report for other potential owners.
    """
    admin_token = get_token("admin@campus.edu", "admin123")

    client.post(
        "/auth/register",
        json={"email": "hf_finder@campus.edu", "password": "FinderPass2026!"},
    )
    client.post(
        "/auth/register",
        json={"email": "hf_claimant@campus.edu", "password": "ClaimerPass2026!"},
    )

    finder_token = get_token("hf_finder@campus.edu", "FinderPass2026!")
    claimant_token = get_token("hf_claimant@campus.edu", "ClaimerPass2026!")

    db = SessionLocal()
    cat = db.query(Category).first()
    category_id = cat.id
    db.close()

    # Found report
    rep_res = client.post(
        "/reports",
        json={
            "type": "found",
            "title": "Black Umbrella with wooden handle",
            "description": "Found in cafeteria entrance",
            "category_id": category_id,
            "location": "Cafeteria",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {finder_token}"},
    )
    report_id = rep_res.json()["id"]

    # Claimant submits claim
    claim_res = client.post(
        f"/reports/{report_id}/claims",
        json={"proof_details": "My umbrella has a carved initial 'A' on the handle"},
        headers={"Authorization": f"Bearer {claimant_token}"},
    )
    claim_id = claim_res.json()["id"]

    # Admin approves the claim
    client.patch(
        f"/claims/{claim_id}",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # 1. Claimant meets finder and realizes the handle does not match. Claimant flags mismatch.
    flag_c1 = client.post(
        f"/claims/{claim_id}/flag-handover-failed",
        json={"reason": "Met at cafeteria; handle initial is 'B', not 'A'. Not my umbrella."},
        headers={"Authorization": f"Bearer {claimant_token}"},
    )
    assert flag_c1.status_code == 200
    assert flag_c1.json()["claimant_handover_failed"] is True
    assert flag_c1.json()["finder_handover_failed"] is False
    assert flag_c1.json()["status"] == "approved"  # Still approved until mutual confirmation

    # 2. Finder also flags mismatch
    flag_f1 = client.post(
        f"/claims/{claim_id}/flag-handover-failed",
        json={"reason": "Confirmed physical mismatch; the student verified it is not their item."},
        headers={"Authorization": f"Bearer {finder_token}"},
    )
    assert flag_f1.status_code == 200
    assert flag_f1.json()["claimant_handover_failed"] is True
    assert flag_f1.json()["finder_handover_failed"] is True
    assert flag_f1.json()["status"] == "handover_failed"  # Transitioned to handover_failed!

    # 3. Admin reposts / reactivates the report
    repost_res = client.post(
        f"/claims/{claim_id}/repost-report",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert repost_res.status_code == 200
    assert repost_res.json()["status"] == "handover_failed"
    assert repost_res.json()["report"]["status"] == "active"

    # Verify report is active in public listings again
    db = SessionLocal()
    rep = db.query(Report).filter(Report.id == report_id).first()
    assert rep.status == ReportStatus.ACTIVE.value
    assert rep.founder_id is None
    db.close()
