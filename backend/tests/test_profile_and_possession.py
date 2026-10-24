from fastapi.testclient import TestClient
from datetime import datetime, timezone
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.report import Report, ReportType, ReportStatus, PossessionStatus
from app.models.claim import Claim, ClaimStatus
from app.models.category import Category

client = TestClient(app)


def get_token(email: str, password: str) -> str:
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_update_student_profile():
    """Verify PATCH /auth/profile/me updates full_name, phone_number, department."""
    token = get_token("student@campus.edu", "StudentPass2026!")
    headers = {"Authorization": f"Bearer {token}"}

    update_payload = {
        "full_name": "Abebe Bikila",
        "phone_number": "+251911223344",
        "department": "Computer Science & IT",
    }
    res = client.patch("/auth/profile/me", json=update_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Abebe Bikila"
    assert data["phone_number"] == "+251911223344"
    assert data["department"] == "Computer Science & IT"

    # Also verify GET /auth/me returns updated fields
    res_me = client.get("/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["full_name"] == "Abebe Bikila"


def test_profile_phone_number_privacy_gating():
    """
    Verify phone number is masked for unrelated students,
    but visible to admin, self, and approved claim participants.
    """
    db = SessionLocal()
    # Ensure student has phone number
    student = db.query(User).filter(User.email == "student@campus.edu").first()
    student.phone_number = "+251911223344"
    student.full_name = "Abebe Bikila"
    student.department = "Computer Science"

    # Create a secondary test student
    other_student = db.query(User).filter(User.email == "other_student@campus.edu").first()
    if not other_student:
        other_student = User(
            email="other_student@campus.edu",
            password_hash="$argon2id$v=19$m=65536,t=3,p=4$fakehashfortest123456789",
            role=UserRole.USER.value,
            full_name="Fatuma Roba",
            phone_number="+251988776655",
            department="Electrical Engineering",
        )
        db.add(other_student)
    else:
        other_student.phone_number = "+251988776655"
        other_student.full_name = "Fatuma Roba"
    db.commit()
    db.refresh(student)
    db.refresh(other_student)
    student_id = student.id
    other_student_id = other_student.id
    db.close()

    admin_token = get_token("admin@campus.edu", "AdminPass2026!")
    student_token = get_token("student@campus.edu", "StudentPass2026!")

    # 1. Admin views student profile: phone is visible
    res_admin = client.get(
        f"/auth/profile/{student_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["phone_number"] == "+251911223344"
    assert res_admin.json()["full_name"] == "Abebe Bikila"

    # 2. Student views own profile: phone is visible
    res_self = client.get(
        f"/auth/profile/{student_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_self.status_code == 200
    assert res_self.json()["phone_number"] == "+251911223344"

    # 3. Student views other_student (no approved claim): phone MUST BE MASKED (None)
    res_other = client.get(
        f"/auth/profile/{other_student_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_other.status_code == 200
    assert res_other.json()["phone_number"] is None
    assert res_other.json()["full_name"] == "Fatuma Roba"
    assert res_other.json()["department"] == "Electrical Engineering"


def test_possession_status_and_custody_in_reports():
    """Verify report creation with possession_status, custody_location and filtering."""
    token = get_token("student@campus.edu", "StudentPass2026!")
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    category = db.query(Category).first()
    db.close()

    # 1. Create Found Report with custody submitted to Campus Security
    payload = {
        "type": "found",
        "title": "Blue Dell Laptop Charger",
        "description": "Found near Engineering Block B room 204",
        "category_id": category.id,
        "location": "Engineering Block B",
        "item_date": datetime.now(timezone.utc).isoformat(),
        "possession_status": "submitted_to_authority",
        "custody_location": "Campus Security HQ - Guard Room 102",
    }
    res = client.post("/reports", json=payload, headers=headers)
    assert res.status_code == 201
    rep_data = res.json()
    assert rep_data["possession_status"] == "submitted_to_authority"
    assert rep_data["custody_location"] == "Campus Security HQ - Guard Room 102"
    report_id = rep_data["id"]

    # 2. Get report detail
    res_detail = client.get(f"/reports/{report_id}")
    assert res_detail.status_code == 200
    assert res_detail.json()["possession_status"] == "submitted_to_authority"
    assert res_detail.json()["custody_location"] == "Campus Security HQ - Guard Room 102"

    # 3. Search filter by possession_status
    res_search = client.get("/reports?possession_status=submitted_to_authority")
    assert res_search.status_code == 200
    ids = [r["id"] for r in res_search.json()]
    assert report_id in ids


def test_claim_handover_slip_and_contact_disclosure():
    """
    Verify claim flow:
    - Before approval: finder phone masked in claim
    - After approval: finder phone revealed in claim & profile
    - Complete handover sets report possession_status to returned
    """
    admin_token = get_token("admin@campus.edu", "AdminPass2026!")
    student_token = get_token("student@campus.edu", "StudentPass2026!")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}

    db = SessionLocal()
    admin_user = db.query(User).filter(User.role == UserRole.ADMIN.value).first()
    student_user = db.query(User).filter(User.email == "student@campus.edu").first()
    category = db.query(Category).first()

    # Create a report owned by admin (so student can submit a claim on it)
    report = Report(
        type=ReportType.FOUND.value,
        title="Silver Casio Scientific Calculator",
        description="Found in Science lecture hall",
        category_id=category.id,
        owner_id=admin_user.id,
        location="Science Lecture Hall A",
        item_date=datetime.now(timezone.utc),
        status=ReportStatus.ACTIVE.value,
        possession_status=PossessionStatus.WITH_FINDER.value,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    report_id = report.id
    admin_user_id = admin_user.id
    db.close()

    # 1. Student submits claim
    res_claim = client.post(
        f"/reports/{report_id}/claims",
        json={"proof_details": "It has my initials 'AB' scratched on the bottom casing."},
        headers=student_headers,
    )
    assert res_claim.status_code == 201
    claim_id = res_claim.json()["id"]

    # In submitted status, finder phone number should be masked
    assert res_claim.json()["status"] == "submitted"
    assert res_claim.json()["finder"] is not None
    assert res_claim.json()["finder"]["phone_number"] is None

    # 2. Admin approves claim
    res_approve = client.patch(
        f"/claims/{claim_id}",
        json={"status": "approved"},
        headers=admin_headers,
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "approved"

    # Now verify student inspecting claim has finder phone number disclosed!
    # Set admin phone number first
    db = SessionLocal()
    admin = db.query(User).filter(User.id == admin_user_id).first()
    admin.phone_number = "+251922334455"
    db.commit()
    db.close()

    res_claim_detail = client.get(f"/claims/{claim_id}", headers=student_headers)
    assert res_claim_detail.status_code == 200
    detail_data = res_claim_detail.json()
    assert detail_data["status"] == "approved"
    assert detail_data["finder"]["phone_number"] == "+251922334455"

    # Also student viewing admin profile now has phone revealed!
    res_prof = client.get(f"/auth/profile/{admin_user_id}", headers=student_headers)
    assert res_prof.status_code == 200
    assert res_prof.json()["phone_number"] == "+251922334455"

    # 3. Admin confirms handover completion
    res_complete = client.post(f"/claims/{claim_id}/complete", headers=admin_headers)
    assert res_complete.status_code == 200
    assert res_complete.json()["status"] == "completed"

    # Verify report status is recovered and possession_status is returned
    res_rep = client.get(f"/reports/{report_id}")
    assert res_rep.status_code == 200
    assert res_rep.json()["status"] == "recovered"
    assert res_rep.json()["possession_status"] == "returned"


def test_lost_item_found_notice_handshake_and_direct_recovery():
    """
    Issue #7: Verify lost item finder handshake:
    1. Student 1 posts a LOST report.
    2. Owner cannot submit found notice on own report.
    3. Student 2 submits found notice -> sets founder_id, possession_status, found_notes.
    4. Second user cannot submit duplicate found notice.
    5. Contact phone numbers unlocked between owner and founder.
    6. Non-owner cannot mark recovered.
    7. Owner directly marks recovered -> sets status=recovered, possession_status=returned.
    """
    import uuid
    uid = uuid.uuid4().hex[:6]
    email1 = f"loser_{uid}@campus.edu"
    email2 = f"finder_{uid}@campus.edu"

    # 1. Register two unique students
    res_reg1 = client.post("/auth/register", json={"email": email1, "password": "Password123!"})
    res_reg2 = client.post("/auth/register", json={"email": email2, "password": "Password123!"})
    
    t1 = client.post("/auth/login", json={"email": email1, "password": "Password123!"}).json()["access_token"]
    t2 = client.post("/auth/login", json={"email": email2, "password": "Password123!"}).json()["access_token"]
    h1 = {"Authorization": f"Bearer {t1}"}
    h2 = {"Authorization": f"Bearer {t2}"}

    # Set phone numbers and profile info
    client.patch("/auth/profile/me", json={"full_name": "Abebe Loser", "phone_number": "+251911111111"}, headers=h1)
    client.patch("/auth/profile/me", json={"full_name": "Chala Finder", "phone_number": "+251922222222"}, headers=h2)

    db = SessionLocal()
    u1 = db.query(User).filter(User.email == email1).first()
    u2 = db.query(User).filter(User.email == email2).first()
    category = db.query(Category).first()
    u1_id = u1.id
    u2_id = u2.id
    category_id = category.id
    db.close()

    # Create Lost Report
    lost_payload = {
        "type": "lost",
        "title": "Black Leather Wallet with Student ID",
        "description": "Dropped near the cafeteria around noon.",
        "category_id": category_id,
        "location": "Cafeteria Gate 2",
        "item_date": datetime.now(timezone.utc).isoformat(),
        "identifying_details": "Has 500 birr and student ID #12345",
    }
    res_rep = client.post("/reports", json=lost_payload, headers=h1)
    assert res_rep.status_code == 201
    rep_data = res_rep.json()
    rep_id = rep_data["id"]
    assert rep_data["possession_status"] == "lost_unknown"
    assert rep_data["founder_id"] is None

    # Verify phone is not visible before handshake
    res_prof = client.get(f"/auth/profile/{u2_id}", headers=h1)
    assert res_prof.status_code == 200
    assert res_prof.json()["phone_number"] is None

    # 2. Owner cannot submit found notice
    res_self = client.post(
        f"/reports/{rep_id}/found-notice",
        json={
            "founder_proof": "I found it myself?",
            "possession_status": "with_finder",
            "found_notes": "I found it myself?",
        },
        headers=h1,
    )
    assert res_self.status_code == 400
    assert "own lost report" in res_self.json()["detail"]

    # 3. Finder submits found notice with mandatory double-blind proof
    found_payload = {
        "founder_proof": "Found black wallet with student ID #12345 inside and paper cash under table 4",
        "possession_status": "with_finder",
        "found_notes": "Safely with me. Available after class.",
    }
    res_notice = client.post(f"/reports/{rep_id}/found-notice", json=found_payload, headers=h2)
    assert res_notice.status_code == 200
    notice_data = res_notice.json()
    assert notice_data["founder_id"] == u2_id
    assert notice_data["possession_status"] == "with_finder"
    assert notice_data["claim_status"] == "submitted"
    assert notice_data["claim_id"] is not None
    claim_id = notice_data["claim_id"]

    # 4. Duplicate found notice rejected
    res_dup = client.post(f"/reports/{rep_id}/found-notice", json=found_payload, headers=h2)
    assert res_dup.status_code == 400

    # 5. BEFORE ADMIN APPROVAL: Phone numbers MUST BE MASKED (anti-theft gate)
    res_prof_finder = client.get(f"/auth/profile/{u2_id}", headers=h1)
    assert res_prof_finder.status_code == 200
    assert res_prof_finder.json()["phone_number"] is None

    res_prof_owner = client.get(f"/auth/profile/{u1_id}", headers=h2)
    assert res_prof_owner.status_code == 200
    assert res_prof_owner.json()["phone_number"] is None

    # Owner CANNOT prematurely mark recovered before admin approval
    res_premature_rec = client.post(f"/reports/{rep_id}/recover", headers=h1)
    assert res_premature_rec.status_code == 400
    assert "pending admin verification" in res_premature_rec.json()["detail"]

    # 6. Admin logs in and performs double-blind verification in Claims Manager
    admin_token = client.post("/auth/login", json={"email": "admin@campus.edu", "password": "AdminPass2026!"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res_claims = client.get("/claims", headers=admin_headers)
    assert res_claims.status_code == 200
    target_claim = next((c for c in res_claims.json() if c["id"] == claim_id), None)
    assert target_claim is not None
    assert target_claim["status"] == "submitted"
    assert target_claim["verification_record"]["proof_details"] == found_payload["founder_proof"]
    # Admin sees secret owner proof from report
    assert target_claim["report"]["identifying_details"] == lost_payload["identifying_details"]

    # Admin APPROVES the verified match
    res_approve = client.patch(f"/claims/{claim_id}", json={"status": "approved"}, headers=admin_headers)
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "approved"

    # 7. AFTER ADMIN APPROVAL: Phone numbers UNLOCKED
    res_prof_finder_after = client.get(f"/auth/profile/{u2_id}", headers=h1)
    assert res_prof_finder_after.status_code == 200
    assert res_prof_finder_after.json()["phone_number"] == "+251922222222"

    res_prof_owner_after = client.get(f"/auth/profile/{u1_id}", headers=h2)
    assert res_prof_owner_after.status_code == 200
    assert res_prof_owner_after.json()["phone_number"] == "+251911111111"

    # 8. Non-owner cannot mark recovered
    res_bad_rec = client.post(f"/reports/{rep_id}/recover", headers=h2)
    assert res_bad_rec.status_code == 403

    # 9. Owner directly confirms receipt & marks recovered
    res_rec = client.post(f"/reports/{rep_id}/recover", headers=h1)
    assert res_rec.status_code == 200
    rec_data = res_rec.json()
    assert rec_data["status"] == "recovered"
    assert rec_data["possession_status"] == "returned"

    # Verify claim is now transitioned to 'completed'
    res_claim_completed = client.get(f"/claims/{claim_id}", headers=admin_headers)
    assert res_claim_completed.status_code == 200
    assert res_claim_completed.json()["status"] == "completed"

