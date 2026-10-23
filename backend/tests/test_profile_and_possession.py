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
