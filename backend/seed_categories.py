import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, Base, engine
from app.models.category import Category

DEFAULT_CATEGORIES = [
    "Electronics",
    "Bags & Backpacks",
    "Keys & Access Cards",
    "Wallets & Purses",
    "Student IDs & Documents",
    "Clothing & Accessories",
    "Books & Stationery",
    "Water Bottles & Flasks",
    "Other Items",
]


def seed_categories():
    """Seeds standard campus categories."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    print("--- Seeding Campus Categories ---")
    try:
        for name in DEFAULT_CATEGORIES:
            existing = db.query(Category).filter(Category.name == name).first()
            if not existing:
                cat = Category(name=name)
                db.add(cat)
                db.commit()
                print(f" Created category: {name}")
            else:
                print(f" Category already exists: {name}")
    finally:
        db.close()
    print("--- Seeding Categories Complete ---")


if __name__ == "__main__":
    seed_categories()
