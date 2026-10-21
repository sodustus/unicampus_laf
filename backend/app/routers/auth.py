from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/auth", tags=["Authentication & Accounts"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    FR-AUTH-01: Visitor registers with email and password; duplicate emails are rejected.
    FR-AUTH-05: Role is always 'user' by default, not selectable on public form.
    """
    normalized_email = user_in.email.strip().lower()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    new_user = User(
        email=normalized_email,
        password_hash=hash_password(user_in.password),
        role=UserRole.USER.value,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(subject=new_user.id, role=new_user.role)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    FR-AUTH-03: Rejects invalid credentials without revealing whether email or password was wrong.
    """
    normalized_email = credentials.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    generic_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user:
        raise generic_error

    if not verify_password(credentials.password, user.password_hash):
        raise generic_error

    access_token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the profile of the currently authenticated user."""
    return current_user


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    FR-AUTH-04: Confirms logout for the active user credential.
    """
    return {"message": "Successfully logged out."}


@router.get("/admin-check")
def admin_only_check(admin_user: User = Depends(require_admin)):
    """
    Test endpoint for role-based authorization verification (FR-AUTH-07, NFR-02).
    """
    return {
        "status": "authorized",
        "message": f"Welcome Administrator {admin_user.email}",
        "role": admin_user.role,
    }
