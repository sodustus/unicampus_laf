from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.claim import Claim, ClaimStatus
from app.models.report import Report
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    UserProfileUpdate,
    UserProfilePublic,
)
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
        phone_number=user_in.phone_number.strip() if user_in.phone_number else None,
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


@router.patch("/profile/me", response_model=UserResponse)
def update_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Issue #2: Update student profile details (full_name, phone_number, department).
    """
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name.strip() or None
    if profile_in.phone_number is not None:
        current_user.phone_number = profile_in.phone_number.strip() or None
    if profile_in.department is not None:
        current_user.department = profile_in.department.strip() or None

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/profile/{user_id}", response_model=UserProfilePublic)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Issue #2: View user profile with conditional phone number disclosure.
    Phone is revealed only if viewer is admin, the user themselves, or has an approved/completed claim with the user.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    reports_count = db.query(Report).filter(
        Report.owner_id == target_user.id,
        Report.deleted_at.is_(None),
    ).count()

    can_view_phone = False
    if current_user.role == UserRole.ADMIN.value or current_user.id == target_user.id:
        can_view_phone = True
    else:
        has_approved_claim = db.query(Claim).join(Report, Claim.report_id == Report.id).filter(
            Claim.status.in_([ClaimStatus.APPROVED.value, ClaimStatus.COMPLETED.value]),
            (
                (Claim.claimant_id == current_user.id) & (Report.owner_id == target_user.id)
            ) | (
                (Claim.claimant_id == target_user.id) & (Report.owner_id == current_user.id)
            )
        ).first() is not None

        if has_approved_claim:
            can_view_phone = True

    return UserProfilePublic(
        id=target_user.id,
        email=target_user.email,
        role=target_user.role,
        is_active=target_user.is_active,
        full_name=target_user.full_name,
        department=target_user.department,
        phone_number=target_user.phone_number if can_view_phone else None,
        reports_count=reports_count,
        created_at=target_user.created_at,
    )


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
