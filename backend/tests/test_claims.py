from fastapi.testclient import TestClient
from datetime import datetime, timezone
from app.main import app
from app.db.session import SessionLocal
from app.models.category import Category
from app.models.report import Report, ReportType, ReportStatus
from app.models.user import User
from app.models.claim import Claim, ClaimStatus

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


def test_owner_handover_receipt_confirmation():
    """
    Verifies that:
    1. Owner and finder are correctly decoupled in ClaimResponse (owner != finder).
    2. Owner can confirm physical receipt of the item via POST /claims/{id}/confirm-receipt.
    3. Non-owner/non-admin cannot confirm receipt (403 Forbidden).
    4. Admin can complete handover after approval.
    """
    owner_email = "owner_receipt_test@campus.edu"
    finder_email = "finder_receipt_test@campus.edu"
    random_email = "random_receipt_test@campus.edu"

    client.post("/auth/register", json={"email": owner_email, "password": "Password123!"})
    client.post("/auth/register", json={"email": finder_email, "password": "Password123!"})
    client.post("/auth/register", json={"email": random_email, "password": "Password123!"})

    owner_token = get_token(owner_email, "Password123!")
    finder_token = get_token(finder_email, "Password123!")
    random_token = get_token(random_email, "Password123!")
    admin_token = get_token("admin@campus.edu", "AdminPass2026!")

    db = SessionLocal()
    category_id = db.query(Category).first().id
    db.close()

    # 1. Owner registers a lost report
    lost_res = client.post(
        "/reports",
        json={
            "type": "lost",
            "title": "Lost ThinkPad X1 Carbon",
            "description": "Left on table 4",
            "category_id": category_id,
            "location": "Science Library",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert lost_res.status_code == 201
    lost_id = lost_res.json()["id"]

    try:
        # 2. Finder submits found notice
        found_notice_res = client.post(
            f"/reports/{lost_id}/found-notice",
            json={
                "founder_proof": "I found it and have it with me",
                "possession_status": "with_finder",
            },
            headers={"Authorization": f"Bearer {finder_token}"},
        )
        assert found_notice_res.status_code == 200

        # Retrieve the claim generated by the found notice
        claims_list = client.get("/claims", headers={"Authorization": f"Bearer {admin_token}"}).json()
        matching_claim = next(c for c in claims_list if c["report_id"] == lost_id)
        claim_id = matching_claim["id"]

        # 3. Fetch claim as admin and verify distinct finder vs owner
        admin_claim_res = client.get(
            f"/claims/{claim_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert admin_claim_res.status_code == 200
        claim_data = admin_claim_res.json()
        assert claim_data["owner"] is not None
        assert claim_data["finder"] is not None
        assert claim_data["owner"]["email"] == owner_email
        assert claim_data["finder"]["email"] == finder_email
        assert claim_data["owner"]["id"] != claim_data["finder"]["id"]

        # 4. Admin approves claim
        approve_res = client.patch(
            f"/claims/{claim_id}",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert approve_res.status_code == 200

        # 5. Random student tries to confirm receipt -> 403 Forbidden
        bad_confirm = client.post(
            f"/claims/{claim_id}/confirm-receipt",
            headers={"Authorization": f"Bearer {random_token}"},
        )
        assert bad_confirm.status_code == 403

        # 6. Verified owner confirms receipt -> 200 OK
        good_confirm = client.post(
            f"/claims/{claim_id}/confirm-receipt",
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert good_confirm.status_code == 200
        assert good_confirm.json()["owner_confirmed_receipt"] is True

        # 7. Admin completes handover -> 200 OK and report marked recovered
        complete_res = client.post(
            f"/claims/{claim_id}/complete",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert complete_res.status_code == 200
        assert complete_res.json()["status"] == "completed"

        rep_check = client.get(f"/reports/{lost_id}", headers={"Authorization": f"Bearer {owner_token}"})
        assert rep_check.json()["status"] == "recovered"
        assert rep_check.json()["possession_status"] == "returned"
    finally:
        clean_db = SessionLocal()
        from app.models.recovery import RecoveryRecord
        from app.models.claim import VerificationRecord
        claim_ids = [c.id for c in clean_db.query(Claim).filter(Claim.report_id == lost_id).all()]
        if claim_ids:
            clean_db.query(VerificationRecord).filter(VerificationRecord.claim_id.in_(claim_ids)).delete(synchronize_session=False)
        clean_db.query(RecoveryRecord).filter(RecoveryRecord.report_id == lost_id).delete(synchronize_session=False)
        clean_db.query(Claim).filter(Claim.report_id == lost_id).delete(synchronize_session=False)
        clean_db.query(Report).filter(Report.id == lost_id).delete(synchronize_session=False)
        clean_db.commit()
        clean_db.close()


def test_person_cannot_claim_item_more_than_once():
    """
    Enforces rule: A person cannot claim an item (lost or found) more than once.
    - Cannot submit multiple found notices on the same lost report.
    - Cannot submit multiple ownership claims on the same found report (even after rejection).
    """
    owner_email = "single_claim_owner@campus.edu"
    claimer_email = "single_claim_user@campus.edu"
    admin_token = get_token("admin@campus.edu", "AdminPass2026!")

    client.post("/auth/register", json={"email": owner_email, "password": "Password123!"})
    client.post("/auth/register", json={"email": claimer_email, "password": "Password123!"})

    owner_token = get_token(owner_email, "Password123!")
    claimer_token = get_token(claimer_email, "Password123!")

    db = SessionLocal()
    category_id = db.query(Category).first().id
    db.close()

    # 1. Test LOST report: User cannot submit found notice more than once
    lost_res = client.post(
        "/reports",
        json={
            "type": "lost",
            "title": "Lost TI-84 Plus Calculator",
            "description": "Left in room 204",
            "category_id": category_id,
            "location": "Math Building",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert lost_res.status_code == 201
    lost_id = lost_res.json()["id"]

    # 2. Test FOUND report: User cannot submit ownership claim more than once
    found_res = client.post(
        "/reports",
        json={
            "type": "found",
            "title": "Found Black Anker PowerBank",
            "description": "Found on cafeteria table",
            "category_id": category_id,
            "location": "Main Cafeteria",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert found_res.status_code == 201
    found_id = found_res.json()["id"]

    try:
        # User submits first found notice on lost item -> 200 OK
        notice1 = client.post(
            f"/reports/{lost_id}/found-notice",
            json={
                "founder_proof": "It has green tape on battery door",
                "possession_status": "with_finder",
            },
            headers={"Authorization": f"Bearer {claimer_token}"},
        )
        assert notice1.status_code == 200

        # User attempts second found notice on same lost item while notice is pending -> 400 Bad Request
        notice2 = client.post(
            f"/reports/{lost_id}/found-notice",
            json={
                "founder_proof": "Submitting again with extra notes",
                "possession_status": "with_finder",
            },
            headers={"Authorization": f"Bearer {claimer_token}"},
        )
        assert notice2.status_code == 400
        assert "currently being processed" in notice2.json()["detail"].lower()

        # User submits first claim on found item -> 201 Created
        claim1 = client.post(
            f"/reports/{found_id}/claims",
            json={"proof_details": "It has 10000mAh label with scratch across logo"},
            headers={"Authorization": f"Bearer {claimer_token}"},
        )
        assert claim1.status_code == 201
        claim1_id = claim1.json()["id"]

        # User attempts second claim on same found item while first is active -> 400 Bad Request
        claim2 = client.post(
            f"/reports/{found_id}/claims",
            json={"proof_details": "Trying to claim again while under review"},
            headers={"Authorization": f"Bearer {claimer_token}"},
        )
        assert claim2.status_code == 400
        assert "currently being processed" in claim2.json()["detail"].lower()

        # Admin rejects first claim
        reject_res = client.patch(
            f"/claims/{claim1_id}",
            json={"status": "rejected", "rejection_reason": "Insufficient proof"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert reject_res.status_code == 200

        # After rejection, report shows user_has_claimed=False and user_claim_status='rejected'
        detail_after_reject = client.get(f"/reports/{found_id}", headers={"Authorization": f"Bearer {claimer_token}"})
        assert detail_after_reject.status_code == 200
        assert detail_after_reject.json()["user_has_claimed"] is False
        assert detail_after_reject.json()["user_claim_status"] == "rejected"

        # User can now try claiming again with better proof -> 201 Created!
        claim3 = client.post(
            f"/reports/{found_id}/claims",
            json={"proof_details": "Detailed proof: Serial SN-982189 on underside label, small nick on corner"},
            headers={"Authorization": f"Bearer {claimer_token}"},
        )
        assert claim3.status_code == 201
        assert claim3.json()["status"] == "submitted"

        # While claim3 is being processed, submitting another claim is blocked -> 400 Bad Request
        claim4 = client.post(
            f"/reports/{found_id}/claims",
            json={"proof_details": "Spamming another claim while claim3 is pending"},
            headers={"Authorization": f"Bearer {claimer_token}"},
        )
        assert claim4.status_code == 400
        assert "currently being processed" in claim4.json()["detail"].lower()

    finally:
        clean_db = SessionLocal()
        from app.models.recovery import RecoveryRecord
        from app.models.claim import VerificationRecord
        for r_id in [lost_id, found_id]:
            c_ids = [c.id for c in clean_db.query(Claim).filter(Claim.report_id == r_id).all()]
            if c_ids:
                clean_db.query(VerificationRecord).filter(VerificationRecord.claim_id.in_(c_ids)).delete(synchronize_session=False)
            clean_db.query(RecoveryRecord).filter(RecoveryRecord.report_id == r_id).delete(synchronize_session=False)
            clean_db.query(Claim).filter(Claim.report_id == r_id).delete(synchronize_session=False)
            clean_db.query(Report).filter(Report.id == r_id).delete(synchronize_session=False)
        clean_db.commit()
        clean_db.close()



