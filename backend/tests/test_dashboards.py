from fastapi.testclient import TestClient
from datetime import datetime, timezone
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.report import Report, ReportType, ReportStatus
from app.models.claim import Claim, ClaimStatus
from app.core.security import hash_password, create_access_token

client = TestClient(app)


def setup_dashboard_data():
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


def test_user_and_admin_dashboards():
    """FR-DASH-U & FR-DASH-A: Test student and admin dashboard metrics and controls."""
    student_id, student_token, admin_id, admin_token, cat_id = setup_dashboard_data()

    # 1. Create report for student
    res_rep = client.post(
        "/reports",
        json={
            "type": "found",
            "title": "Found Wireless Earbuds",
            "description": "Black charging case near library cafe",
            "category_id": cat_id,
            "location": "Library Cafe",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_rep.status_code == 201
    report_id = res_rep.json()["id"]

    # 2. Query Student Dashboard
    res_user_dash = client.get("/dashboard/user", headers={"Authorization": f"Bearer {student_token}"})
    assert res_user_dash.status_code == 200
    user_dash = res_user_dash.json()
    assert "stats" in user_dash
    assert user_dash["stats"]["active_reports_count"] >= 1
    assert len(user_dash["active_reports"]) >= 1

    # 3. Query Admin Dashboard (FR-DASH-A-01, 06)
    res_admin_dash = client.get("/dashboard/admin", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin_dash.status_code == 200
    admin_dash = res_admin_dash.json()
    assert admin_dash["stats"]["total_reports"] >= 1
    assert "pending_claims" in admin_dash
    assert "recent_activity" in admin_dash

    # 4. Non-admin forbidden from admin dashboard
    res_unauth_dash = client.get("/dashboard/admin", headers={"Authorization": f"Bearer {student_token}"})
    assert res_unauth_dash.status_code == 403

    # 5. Admin lists campus users (FR-DASH-A-04)
    res_users = client.get("/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_users.status_code == 200
    users_list = res_users.json()
    assert len(users_list) >= 2
    target_student = next(u for u in users_list if u["id"] == student_id)
    assert target_student["is_active"] is True

    # 6. Admin moderates report (FR-DASH-A-03)
    res_mod = client.patch(
        f"/admin/reports/{report_id}/moderate",
        json={"status_val": "closed", "moderation_reason": "Duplicate spam report"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_mod.status_code == 200
    assert res_mod.json()["status"] == "closed"
