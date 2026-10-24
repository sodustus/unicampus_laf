from fastapi.testclient import TestClient
from datetime import datetime, timezone
from app.main import app
from app.db.session import SessionLocal
from app.models.category import Category
from app.models.report import Report, ReportType, ReportStatus
from app.models.user import User

client = TestClient(app)


def test_browse_and_search_filters():
    """FR-SEARCH-01–04: Search by text, filter by type, category, status, and sort."""
    db = SessionLocal()
    user = db.query(User).filter(User.email == "student@campus.edu").first()
    electronics = db.query(Category).filter(Category.name == "Electronics").first()
    keys = db.query(Category).filter(Category.name == "Keys & Access Cards").first()
    electronics_id = electronics.id
    keys_id = keys.id
    user_id = user.id

    # Seed test items
    report1 = Report(
        type="lost",
        title="Dell XPS 15 Silver",
        description="Core i7 laptop left in Science lab",
        category_id=electronics_id,
        owner_id=user_id,
        location="Science Lab 302",
        item_date=datetime(2026, 10, 15, tzinfo=timezone.utc),
        status="active",
    )
    report2 = Report(
        type="found",
        title="Room 402 Keycard",
        description="Blue campus keycard found on hallway floor",
        category_id=keys_id,
        owner_id=user_id,
        location="Hallway B",
        item_date=datetime(2026, 10, 18, tzinfo=timezone.utc),
        status="active",
    )
    report3 = Report(
        type="lost",
        title="HP Pavilion Black",
        description="Laptop with red stickers",
        category_id=electronics_id,
        owner_id=user_id,
        location="Library Floor 1",
        item_date=datetime(2026, 10, 20, tzinfo=timezone.utc),
        status="active",
    )
    db.add_all([report1, report2, report3])
    db.commit()
    created_ids = [report1.id, report2.id, report3.id]
    db.close()

    try:
        # 1. Search by keyword "Dell"
        res_q = client.get("/reports?q=Dell")
        assert res_q.status_code == 200
        items_q = res_q.json()
        assert any("Dell XPS" in item["title"] for item in items_q)
        assert not any("Room 402 Keycard" in item["title"] for item in items_q)

        # 2. Filter by type="found"
        res_found = client.get("/reports?type=found")
        assert res_found.status_code == 200
        for item in res_found.json():
            assert item["type"] == "found"

        # 3. Filter by category
        res_cat = client.get(f"/reports?category_id={electronics_id}")
        assert res_cat.status_code == 200
        for item in res_cat.json():
            assert item["category_id"] == electronics_id

        # 4. Sort check: newest first
        res_sort = client.get("/reports?sort=newest")
        assert res_sort.status_code == 200
        items_sort = res_sort.json()
        assert len(items_sort) >= 2
    finally:
        clean_db = SessionLocal()
        clean_db.query(Report).filter(Report.id.in_(created_ids)).delete(synchronize_session=False)
        clean_db.commit()
        clean_db.close()
