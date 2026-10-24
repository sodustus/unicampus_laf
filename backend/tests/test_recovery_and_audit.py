from fastapi.testclient import TestClient
from datetime import datetime, timezone
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.report import Report, ReportType, ReportStatus
from app.models.claim import Claim, ClaimStatus, VerificationRecord
from app.models.recovery import RecoveryRecord
from app.models.audit import AuditLog
from app.core.security import hash_password, create_access_token

client = TestClient(app)


def setup_users():
    db = SessionLocal()
    student = db.query(User).filter(User.email == "abebebikila@campus.edu").first()
    admin = db.query(User).filter(User.email == "admin@campus.edu").first()
    cat = db.query(Category).first()

    student_id = student.id
    student_role = student.role
    admin_id = admin.id
    admin_role = admin.role
    cat_id = cat.id
    db.close()

    student_token = create_access_token(subject=student_id, role=student_role)
    admin_token = create_access_token(subject=admin_id, role=admin_role)
    return student_id, student_token, admin_id, admin_token, cat_id


def test_direct_recovery_and_audit():
    """FR-RECOVER-01 & FR-AUDIT-01: Direct recovery creates RecoveryRecord and AuditLog."""
    student_id, student_token, admin_id, admin_token, cat_id = setup_users()

    # 1. Student creates a lost report
    res_create = client.post(
        "/reports",
        json={
            "type": "lost",
            "title": "Lost Scientific Calculator",
            "description": "TI-84 Plus silver edition",
            "category_id": cat_id,
            "location": "Math Building Room 204",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_create.status_code == 201
    report_id = res_create.json()["id"]

    # 2. Student performs direct recovery
    res_rec = client.post(
        f"/recovery/direct/{report_id}",
        json={"handover_notes": "Found in my backpack locker"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_rec.status_code == 200
    rec_data = res_rec.json()
    assert rec_data["report_id"] == report_id
    assert rec_data["responsible_user_id"] == student_id
    assert "locker" in rec_data["handover_notes"]

    # 3. Verify report status is now recovered
    res_rep = client.get(f"/reports/{report_id}", headers={"Authorization": f"Bearer {student_token}"})
    assert res_rep.status_code == 200
    assert res_rep.json()["status"] == "recovered"

    # 4. Student can view the recovery record
    res_view = client.get(f"/recovery/report/{report_id}", headers={"Authorization": f"Bearer {student_token}"})
    assert res_view.status_code == 200
    assert res_view.json()["id"] == rec_data["id"]

    # 5. Admin can access audit logs (FR-AUDIT-05)
    res_audit = client.get("/audit-logs?action=ITEM_RECOVERED", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_audit.status_code == 200
    logs = res_audit.json()
    assert len(logs) > 0
    assert any(l["target_id"] == report_id for l in logs)

    # 6. Non-admin is strictly forbidden from reading audit logs (FR-AUDIT-05)
    res_unauth = client.get("/audit-logs", headers={"Authorization": f"Bearer {student_token}"})
    assert res_unauth.status_code == 403
