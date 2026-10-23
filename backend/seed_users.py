import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.core.security import hash_password


def seed_users():
    """Seeds default demo accounts for administration and student multi-user dynamics."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    demo_users = [
        {
            "email": "admin@campus.edu",
            "password": "AdminPass2026!",
            "role": UserRole.ADMIN.value,
            "full_name": "Campus Administrator",
            "phone_number": "+251911000000",
            "department": "Campus Security & Administration",
            "label": "Administrator",
        },
        {
            "email": "student@campus.edu",
            "password": "StudentPass2026!",
            "role": UserRole.USER.value,
            "full_name": "Abebe Bikila (Student 0)",
            "phone_number": "+251911223344",
            "department": "Computer Science & IT",
            "label": "Demo Student (Legacy)",
        },
        {
            "email": "student0@campus.edu",
            "password": "password0",
            "role": UserRole.USER.value,
            "full_name": "Abebe Bikila",
            "phone_number": "+251911223344",
            "department": "Computer Science & IT",
            "label": "Student 0 (Finder / Loser)",
        },
        {
            "email": "student1@campus.edu",
            "password": "password1",
            "role": UserRole.USER.value,
            "full_name": "Fatuma Roba",
            "phone_number": "+251922334455",
            "department": "Electrical Engineering",
            "label": "Student 1 (Finder / Claimant)",
        },
        {
            "email": "student2@campus.edu",
            "password": "password2",
            "role": UserRole.USER.value,
            "full_name": "Derartu Tulu",
            "phone_number": "+251933445566",
            "department": "Mechanical Engineering",
            "label": "Student 2 (Good Samaritan / Finder)",
        },
    ]

    print("--- Seeding Demo Accounts (Issue #7: Multi-User Dynamics) ---")
    try:
        for u in demo_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                    full_name=u["full_name"],
                    phone_number=u["phone_number"],
                    department=u["department"],
                )
                db.add(user)
                db.commit()
                print(f" Created {u['label']}: {u['email']} (Password: {u['password']})")
            else:
                existing.password_hash = hash_password(u["password"])
                existing.full_name = u["full_name"]
                existing.phone_number = u["phone_number"]
                existing.department = u["department"]
                db.commit()
                print(f" Updated {u['label']}: {u['email']} (Password: {u['password']})")
    finally:
        db.close()
    print("--- Seeding Completed Successfully ---")


if __name__ == "__main__":
    seed_users()
