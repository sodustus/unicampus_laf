from fastapi.testclient import TestClient
from datetime import datetime, timezone
from app.main import app
from app.db.session import SessionLocal
from app.models.category import Category
from app.models.user import User

client = TestClient(app)


def get_token(email: str, password: str) -> str:
    res = client.post("/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def test_list_categories():
    res = client.get("/categories")
    assert res.status_code == 200
    cats = res.json()
    assert len(cats) >= 5
    names = [c["name"] for c in cats]
    assert "Electronics" in names


def test_create_lost_and_found_reports():
    """FR-LOST-01 & FR-FOUND-01: Create lost and found item reports."""
    student_token = get_token("student@campus.edu", "StudentPass2026!")

    db = SessionLocal()
    electronics = db.query(Category).filter(Category.name == "Electronics").first()
    category_id = electronics.id
    db.close()

    # 1. Create Lost Item Report
    lost_payload = {
        "type": "lost",
        "title": "Silver MacBook Pro 14",
        "description": "Left it on table near library 2nd floor window.",
        "category_id": category_id,
        "location": "Main Library Floor 2",
        "item_date": datetime.now(timezone.utc).isoformat(),
        "identifying_details": "Serial number ending in 8421 with blue anime sticker",
    }
    res_lost = client.post(
        "/reports",
        json=lost_payload,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_lost.status_code == 201
    lost_data = res_lost.json()
    assert lost_data["type"] == "lost"
    assert lost_data["title"] == "Silver MacBook Pro 14"
    assert lost_data["status"] == "active"
    lost_id = lost_data["id"]

    # 2. Create Found Item Report
    found_payload = {
        "type": "found",
        "title": "Blue Hydro Flask Water Bottle",
        "description": "Found under seat in Hall A.",
        "category_id": category_id,
        "location": "Lecture Hall A",
        "item_date": datetime.now(timezone.utc).isoformat(),
        "identifying_details": "Dent on bottom base with student initials 'JD'",
    }
    res_found = client.post(
        "/reports",
        json=found_payload,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_found.status_code == 201
    assert res_found.json()["type"] == "found"


def test_report_detail_and_privacy_boundary():
    """FR-SEARCH-06 & NFR-09: Sensitive identifying details never exposed to non-owners."""
    student_token = get_token("student@campus.edu", "StudentPass2026!")
    admin_token = get_token("admin@campus.edu", "AdminPass2026!")

    db = SessionLocal()
    cat = db.query(Category).first()
    db.close()

    # Create report as student
    create_res = client.post(
        "/reports",
        json={
            "type": "lost",
            "title": "Confidential Notebook",
            "description": "Black leather notebook",
            "category_id": cat.id,
            "location": "Cafeteria",
            "item_date": datetime.now(timezone.utc).isoformat(),
            "identifying_details": "Has secret password written on back page 104",
        },
        headers={"Authorization": f"Bearer {student_token}"},
    )
    report_id = create_res.json()["id"]

    # 1. Owner views detail -> identifying details visible
    owner_view = client.get(
        f"/reports/{report_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert owner_view.status_code == 200
    assert owner_view.json()["identifying_details"] == "Has secret password written on back page 104"

    # 2. Admin views detail -> identifying details visible
    admin_view = client.get(
        f"/reports/{report_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_view.status_code == 200
    assert admin_view.json()["identifying_details"] == "Has secret password written on back page 104"

    # 3. Unauthenticated public view -> identifying details sanitized to None
    public_view = client.get(f"/reports/{report_id}")
    assert public_view.status_code == 200
    assert public_view.json()["identifying_details"] is None

    # 4. Another student views -> identifying details sanitized to None
    # Register second student
    client.post(
        "/auth/register",
        json={"email": "second_student@campus.edu", "password": "SecondStudentPass1!"},
    )
    second_token = get_token("second_student@campus.edu", "SecondStudentPass1!")

    other_view = client.get(
        f"/reports/{report_id}",
        headers={"Authorization": f"Bearer {second_token}"},
    )
    assert other_view.status_code == 200
    assert other_view.json()["identifying_details"] is None


def test_report_edit_delete_and_recovery():
    """FR-LOST-04, FR-LOST-05, FR-LOST-06: Edit, recovery, and soft-delete."""
    student_token = get_token("student@campus.edu", "StudentPass2026!")
    second_token = get_token("second_student@campus.edu", "SecondStudentPass1!")

    db = SessionLocal()
    cat = db.query(Category).first()
    db.close()

    # Create report
    res = client.post(
        "/reports",
        json={
            "type": "lost",
            "title": "AirPods Pro Case",
            "description": "White case with scratches",
            "category_id": cat.id,
            "location": "Gym",
            "item_date": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {student_token}"},
    )
    report_id = res.json()["id"]

    # 1. Non-owner cannot edit -> 403 Forbidden
    res_bad_edit = client.patch(
        f"/reports/{report_id}",
        json={"title": "Hacked title"},
        headers={"Authorization": f"Bearer {second_token}"},
    )
    assert res_bad_edit.status_code == 403

    # 2. Owner can edit -> 200 OK
    res_good_edit = client.patch(
        f"/reports/{report_id}",
        json={"title": "AirPods Pro 2nd Gen Case (Updated)"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_good_edit.status_code == 200
    assert res_good_edit.json()["title"] == "AirPods Pro 2nd Gen Case (Updated)"

    # 3. Owner marks recovered directly -> 200 OK
    res_recover = client.post(
        f"/reports/{report_id}/recover",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_recover.status_code == 200
    assert res_recover.json()["status"] == "recovered"

    # 4. Owner soft-deletes report -> 200 OK
    res_del = client.delete(
        f"/reports/{report_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_del.status_code == 200

    # 5. Deleted report no longer returned in GET /reports/{id}
    res_get_deleted = client.get(f"/reports/{report_id}")
    assert res_get_deleted.status_code == 404
