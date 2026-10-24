from fastapi.testclient import TestClient
from datetime import datetime, timezone
from app.main import app
from app.db.session import SessionLocal
from app.models.category import Category
from app.models.report import Report, ReportType, ReportStatus
from app.models.user import User

client = TestClient(app)


def get_token(email: str, password: str) -> str:
    res = client.post("/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def test_claims_lifecycle_and_state_machine():
    """
    Tests the complete 6-state claim machine (§6.2), verification record,
    info-request loop, rejection reason requirement, and handover completion.
    """
    student_token = get_token("student@campus.edu", "StudentPass2026!")
    admin_token = get_token("admin@campus.edu", "AdminPass2026!")

    # Register finder
    client.post(
        "/auth/register",
        json={"email": "finder@campus.edu", "password": "FinderPass2026!"},
    )
    finder_token = get_token("finder@campus.edu", "FinderPass2026!")

    db = SessionLocal()
    cat = db.query(Category).first()
    category_id = cat.id
    db.close()

    # 1. Finder creates a FOUND item report
    found_res = client.post(
        "/reports",
        json={
            "type": "found",
            "title": "TI-84 Plus CE Calculator",
            "description": "Black graphing calculator found in Math Hall",
            "category_id": category_id,
            "location": "Math Building Room 101",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {finder_token}"},
    )
    assert found_res.status_code == 201
    report_id = found_res.json()["id"]

    # 2. FR-CLAIM-01: Finder cannot claim their own found item -> 400
    res_self = client.post(
        f"/reports/{report_id}/claims",
        json={"proof_details": "This is mine actually"},
        headers={"Authorization": f"Bearer {finder_token}"},
    )
    assert res_self.status_code == 400

    # 3. Student submits a legitimate claim
    claim_res = client.post(
        f"/reports/{report_id}/claims",
        json={"proof_details": "Has my name engraved on battery cover: Alex M."},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert claim_res.status_code == 201
    claim_data = claim_res.json()
    assert claim_data["status"] == "submitted"
    assert claim_data["report_id"] == report_id
    claim_id = claim_data["id"]

    # 4. Duplicate claim by same student on same item -> 400
    res_dup = client.post(
        f"/reports/{report_id}/claims",
        json={"proof_details": "Submitting again"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_dup.status_code == 400

    # 5. FR-CLAIM-08: Third party cannot view claim detail -> 403
    client.post(
        "/auth/register",
        json={"email": "stranger@campus.edu", "password": "StrangerPass2026!"},
    )
    stranger_token = get_token("stranger@campus.edu", "StrangerPass2026!")
    res_stranger = client.get(
        f"/claims/{claim_id}",
        headers={"Authorization": f"Bearer {stranger_token}"},
    )
    assert res_stranger.status_code == 403

    # 6. Admin views claims queue and moves claim to Under Review
    res_review = client.patch(
        f"/claims/{claim_id}",
        json={"status": "under_review"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_review.status_code == 200
    assert res_review.json()["status"] == "under_review"

    # 7. §6.2 Loop: Admin requests more information
    res_req_info = client.patch(
        f"/claims/{claim_id}",
        json={"status": "awaiting_info"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_req_info.status_code == 200
    assert res_req_info.json()["status"] == "awaiting_info"

    # 8. Claimant responds with additional information -> loops back to Under Review
    res_respond = client.post(
        f"/claims/{claim_id}/respond",
        json={"additional_info": "Uploaded purchase receipt showing serial number match."},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_respond.status_code == 200
    assert res_respond.json()["status"] == "under_review"
    assert "purchase receipt" in res_respond.json()["verification_record"]["additional_info"]

    # 9. Admin approves claim
    res_approve = client.patch(
        f"/claims/{claim_id}",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "approved"

    # 10. FR-CLAIM-06 & FR-CLAIM-07: Admin confirms handover -> claim moves to Completed, report cascades to Recovered
    res_complete = client.post(
        f"/claims/{claim_id}/complete",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_complete.status_code == 200
    assert res_complete.json()["status"] == "completed"

    # Verify report status is now Recovered
    check_report = client.get(f"/reports/{report_id}")
    assert check_report.status_code == 200
    assert check_report.json()["status"] == "recovered"


def test_claim_rejection_requires_reason():
    """FR-CLAIM-05: Rejection requires a recorded reason and sets end state."""
    student_token = get_token("student@campus.edu", "StudentPass2026!")
    admin_token = get_token("admin@campus.edu", "AdminPass2026!")

    db = SessionLocal()
    cat = db.query(Category).first()
    category_id = cat.id
    db.close()

    # Create found report
    found_res = client.post(
        "/reports",
        json={
            "type": "found",
            "title": "Red Nike Backpack",
            "description": "Found near stadium",
            "category_id": category_id,
            "location": "Stadium Gate 3",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    report_id = found_res.json()["id"]

    # Student submits claim
    claim_res = client.post(
        f"/reports/{report_id}/claims",
        json={"proof_details": "It has my gym shoes inside"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    claim_id = claim_res.json()["id"]

    # 1. Admin attempts rejection without reason -> 400
    bad_reject = client.patch(
        f"/claims/{claim_id}",
        json={"status": "rejected"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert bad_reject.status_code == 400
    assert "rejection reason must be recorded" in bad_reject.json()["detail"].lower()

    # 2. Admin rejects with reason -> 200 OK
    good_reject = client.patch(
        f"/claims/{claim_id}",
        json={
            "status": "rejected",
            "rejection_reason": "Proof provided does not match item contents.",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert good_reject.status_code == 200
    assert good_reject.json()["status"] == "rejected"
    assert good_reject.json()["rejection_reason"] == "Proof provided does not match item contents."


def test_reporter_cannot_be_claimer():
    """
    Enforces the rule that a user cannot be both the reporter and claimer on the same report.
    - User who reported a FOUND item cannot file an ownership claim on it.
    - User who reported a LOST item cannot file a found notice on their own report.
    - Rule applies regardless of user role.
    """
    reporter_email = "sole_reporter@campus.edu"
    client.post("/auth/register", json={"email": reporter_email, "password": "Password123!"})
    reporter_token = get_token(reporter_email, "Password123!")

    db = SessionLocal()
    category_id = db.query(Category).first().id
    db.close()

    # 1. Reporter submits a FOUND item report
    found_res = client.post(
        "/reports",
        json={
            "type": "found",
            "title": "Silver iPad Pro in Library",
            "description": "Found on 3rd floor study desk",
            "category_id": category_id,
            "location": "Library 3rd Floor",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {reporter_token}"},
    )
    assert found_res.status_code == 201
    found_id = found_res.json()["id"]

    lost_id = None
    try:
        # Reporter tries to claim their own found report -> 400
        claim_attempt = client.post(
            f"/reports/{found_id}/claims",
            json={"proof_details": "I am actually the owner claiming it back"},
            headers={"Authorization": f"Bearer {reporter_token}"},
        )
        assert claim_attempt.status_code == 400
        assert "cannot be both the reporter and claimer" in claim_attempt.json()["detail"].lower()

        # 2. Reporter submits a LOST item report
        lost_res = client.post(
            "/reports",
            json={
                "type": "lost",
                "title": "Lost Hydro Flask Blue",
                "description": "Left in gym locker room",
                "category_id": category_id,
                "location": "Campus Recreation Center",
                "item_date": datetime.now(timezone.utc).isoformat(),
            },
            headers={"Authorization": f"Bearer {reporter_token}"},
        )
        assert lost_res.status_code == 201
        lost_id = lost_res.json()["id"]

        # Reporter tries to submit a found notice on their own lost item -> 400
        found_notice_attempt = client.post(
            f"/reports/{lost_id}/found-notice",
            json={
                "founder_proof": "I found my own water bottle",
                "possession_status": "with_finder",
            },
            headers={"Authorization": f"Bearer {reporter_token}"},
        )
        assert found_notice_attempt.status_code == 400
        assert "cannot be both the reporter and claimer" in found_notice_attempt.json()["detail"].lower()
    finally:
        clean_db = SessionLocal()
        ids_to_del = [i for i in [found_id, lost_id] if i is not None]
        clean_db.query(Report).filter(Report.id.in_(ids_to_del)).delete(synchronize_session=False)
        clean_db.commit()
        clean_db.close()

