from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User

client = TestClient(app)


def test_user_registration_and_duplicate_rejection():
    """FR-AUTH-01 & FR-AUTH-05: Register visitor, reject duplicates, enforce 'user' role."""
    unique_email = "newstudent_test@campus.edu"
    password = "SafePassword123!"

    # Clean up if leftover from previous test run
    db = SessionLocal()
    db.query(User).filter(User.email == unique_email).delete()
    db.commit()
    db.close()

    # 1. Register new user
    res = client.post("/auth/register", json={"email": unique_email, "password": password})
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == unique_email
    assert data["user"]["role"] == "user"  # FR-AUTH-05: cannot self-register as admin

    # 2. FR-AUTH-02: Verify password in DB is a hash, NOT plaintext
    db = SessionLocal()
    user_db = db.query(User).filter(User.email == unique_email).first()
    assert user_db is not None
    assert user_db.password_hash != password
    assert user_db.password_hash.startswith("$argon2")
    db.close()

    # 3. FR-AUTH-01: Duplicate registration must be rejected
    res_dup = client.post("/auth/register", json={"email": unique_email, "password": password})
    assert res_dup.status_code == 400
    assert "already exists" in res_dup.json()["detail"].lower()


def test_login_success_and_invalid_credentials():
    """FR-AUTH-03: Login issue token, reject bad credentials generically."""
    # 1. Valid login using seeded student account
    res_valid = client.post(
        "/auth/login",
        json={"email": "student@campus.edu", "password": "StudentPass2026!"},
    )
    assert res_valid.status_code == 200
    token_data = res_valid.json()
    assert "access_token" in token_data
    assert token_data["user"]["role"] == "user"

    # 2. Invalid password
    res_bad_pw = client.post(
        "/auth/login",
        json={"email": "student@campus.edu", "password": "WrongPassword!"},
    )
    assert res_bad_pw.status_code == 401
    assert res_bad_pw.json()["detail"] == "Invalid email or password"

    # 3. Nonexistent email
    res_no_user = client.post(
        "/auth/login",
        json={"email": "ghost_nonexistent@campus.edu", "password": "AnyPassword"},
    )
    assert res_no_user.status_code == 401
    assert res_no_user.json()["detail"] == "Invalid email or password"


def test_auth_me_protected_route():
    """FR-AUTH-07: Protected routes require valid Bearer token."""
    # 1. Without token -> 401 Unauthorized
    res_unauth = client.get("/auth/me")
    assert res_unauth.status_code == 401

    # 2. With valid student token
    login_res = client.post(
        "/auth/login",
        json={"email": "student@campus.edu", "password": "StudentPass2026!"},
    )
    token = login_res.json()["access_token"]

    res_auth = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_auth.status_code == 200
    assert res_auth.json()["email"] == "student@campus.edu"


def test_role_based_access_control():
    """FR-AUTH-07 & NFR-02: Server-side role authorization enforcement."""
    # 1. Regular student attempts admin endpoint -> 403 Forbidden
    student_login = client.post(
        "/auth/login",
        json={"email": "student@campus.edu", "password": "StudentPass2026!"},
    )
    student_token = student_login.json()["access_token"]
    res_student_forbidden = client.get(
        "/auth/admin-check",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res_student_forbidden.status_code == 403
    assert "Administrator access required" in res_student_forbidden.json()["detail"]

    # 2. Administrator attempts admin endpoint -> 200 OK
    admin_login = client.post(
        "/auth/login",
        json={"email": "admin@campus.edu", "password": "AdminPass2026!"},
    )
    admin_token = admin_login.json()["access_token"]
    res_admin_ok = client.get(
        "/auth/admin-check",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin_ok.status_code == 200
    assert res_admin_ok.json()["status"] == "authorized"
