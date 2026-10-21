from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from pwdlib import PasswordHash
import jwt
from app.core.config import settings

# Uses Argon2id as recommended modern password hashing algorithm
password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored Argon2 hash."""
    return password_hasher.verify(plain_password, hashed_password)


def create_access_token(subject: Any, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token containing user identity and role."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a signed JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
