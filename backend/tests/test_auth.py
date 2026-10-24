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
        json={"email": "abebebikila@campus.edu", "password": "password123"},
    )
    assert res_valid.status_code == 200
    token_data = res_valid.json()
    assert "access_token" in token_data
    assert token_data["user"]["role"] == "user"

    # 2. Invalid password
    res_bad_pw = client.post(
        "/auth/login",
        json={"email": "abebebikila@campus.edu", "password": "WrongPassword!"},
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
        json={"email": "abebebikila@campus.edu", "password": "password123"},
    )
    token = login_res.json()["access_token"]

    res_auth = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_auth.status_code == 200
    assert res_auth.json()["email"] == "abebebikila@campus.edu"


def test_role_based_access_control():
    """FR-AUTH-07 & NFR-02: Server-side role authorization enforcement."""
    # 1. Regular student attempts admin endpoint -> 403 Forbidden
    student_login = client.post(
        "/auth/login",
        json={"email": "abebebikila@campus.edu", "password": "password123"},
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
        json={"email": "admin@campus.edu", "password": "admin123"},
    )
    admin_token = admin_login.json()["access_token"]
    res_admin_ok = client.get(
        "/auth/admin-check",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin_ok.status_code == 200
    assert res_admin_ok.json()["status"] == "authorized"


def test_registration_phone_and_email_strictness():
    """
    v7.11 Field Entry Strictness:
    - Rejects letters in phone number (only numbers and optional leading '+').
    - Rejects invalid / gibberish email format.
    - Persists valid numbers-only phone number.
    """
    valid_email = "strict_field_student@campus.edu"
    password = "SafePassword123!"

    # Clean up if leftover
    db = SessionLocal()
    db.query(User).filter(User.email == valid_email).delete()
    db.commit()
    db.close()

    # 1. Invalid email format (gibberish without domain/TLD) -> 422
    res_bad_email = client.post(
        "/auth/register",
        json={"email": "gibberishnonsense", "password": password},
    )
    assert res_bad_email.status_code == 422

    # 2. Invalid phone with letters -> 422
    res_bad_phone = client.post(
        "/auth/register",
        json={
            "email": valid_email,
            "password": password,
            "phone_number": "+251911abc567",
        },
    )
    assert res_bad_phone.status_code == 422
    assert "Phone number must contain only numbers" in str(res_bad_phone.json())

    # 3. Valid registration with clean numbers-only phone -> 201
    res_valid = client.post(
        "/auth/register",
        json={
            "email": valid_email,
            "password": password,
            "phone_number": "+251911234567",
        },
    )
    assert res_valid.status_code == 201
    token = res_valid.json()["access_token"]
    assert res_valid.json()["user"]["phone_number"] == "+251911234567"

    # 4. Profile update with letters in phone -> 422
    res_profile_letters = client.patch(
        "/auth/profile/me",
        json={"phone_number": "0911callme"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_profile_letters.status_code == 422

    # 5. Profile update with valid numbers-only phone -> 200
    res_profile_ok = client.patch(
        "/auth/profile/me",
        json={"phone_number": "0911987654"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_profile_ok.status_code == 200
    assert res_profile_ok.json()["phone_number"] == "0911987654"

    # 6. Local format with >10 characters -> 422
    res_local_too_long = client.patch(
        "/auth/profile/me",
        json={"phone_number": "09830720521"},  # 11 digits
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_local_too_long.status_code == 422

    # 7. International format with >13 characters -> 422
    res_intl_too_long = client.patch(
        "/auth/profile/me",
        json={"phone_number": "+2519830720521"},  # 14 chars
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_intl_too_long.status_code == 422

    # 8. Exactly 10 chars local and exactly 13 chars international -> 200
    res_10 = client.patch(
        "/auth/profile/me",
        json={"phone_number": "0983072052"},  # 10 digits
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_10.status_code == 200
    assert res_10.json()["phone_number"] == "0983072052"

    res_13 = client.patch(
        "/auth/profile/me",
        json={"phone_number": "+251983072052"},  # 13 chars
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_13.status_code == 200
    assert res_13.json()["phone_number"] == "+251983072052"

