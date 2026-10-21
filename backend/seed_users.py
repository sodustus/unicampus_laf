import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.core.security import hash_password


def seed_users():
    """Seeds default demo accounts for administration and student testing."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    demo_users = [
        {
            "email": "admin@campus.edu",
            "password": "AdminPass2026!",
            "role": UserRole.ADMIN.value,
            "label": "Administrator",
        },
        {
            "email": "student@campus.edu",
            "password": "StudentPass2026!",
            "role": UserRole.USER.value,
            "label": "Demo Student / Staff",
        },
    ]

    print("--- Seeding Demo Accounts ---")
    try:
        for u in demo_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                )
                db.add(user)
                db.commit()
                print(f" Created {u['label']}: {u['email']} (Password: {u['password']}) [Role: {u['role']}]")
            else:
                print(f" Account already exists: {u['email']} [Role: {existing.role}]")
    finally:
        db.close()
    print("--- Seeding Completed ---")


if __name__ == "__main__":
    seed_users()
