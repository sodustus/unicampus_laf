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
            "password": "admin123",
            "role": UserRole.ADMIN.value,
            "full_name": "Campus Administrator",
            "phone_number": "+251911000000",
            "department": "Campus Security & Administration",
            "label": "Administrator",
        },
        {
            "email": "abebebikila@campus.edu",
            "password": "password123",
            "role": UserRole.USER.value,
            "full_name": "Abebe Bikila",
            "phone_number": "+251911223344",
            "department": "Computer Science & IT",
            "label": "Abebe Bikila",
        },
        {
            "email": "fatumaroba@campus.edu",
            "password": "password123",
            "role": UserRole.USER.value,
            "full_name": "Fatuma Roba",
            "phone_number": "+251922334455",
            "department": "Electrical Engineering",
            "label": "Fatuma Roba",
        },
        {
            "email": "derartutulu@campus.edu",
            "password": "password123",
            "role": UserRole.USER.value,
            "full_name": "Derartu Tulu",
            "phone_number": "+251933445566",
            "department": "Mechanical Engineering",
            "label": "Derartu Tulu",
        },
        {
            "email": "kenenisabekele@campus.edu",
            "password": "password123",
            "role": UserRole.USER.value,
            "full_name": "Kenenisa Bekele",
            "phone_number": "+251955667788",
            "department": "Software Engineering",
            "label": "Kenenisa Bekele",
        },
        {
            "email": "hailegebrselassie@campus.edu",
            "password": "password123",
            "role": UserRole.USER.value,
            "full_name": "Haile Gebrselassie",
            "phone_number": "+251944556677",
            "department": "Civil & Environmental Engineering",
            "label": "Haile Gebrselassie",
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
