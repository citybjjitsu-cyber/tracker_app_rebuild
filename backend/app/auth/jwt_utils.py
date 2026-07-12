import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.auth.config import JWT_ALGORITHM, JWT_SECRET_KEY


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user_uuid: str, expires_delta: Optional[timedelta] = None) -> tuple[str, str]:
    jti = secrets.token_urlsafe(16)
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(minutes=10))
    payload = {
        "sub": user_uuid,
        "type": "access",
        "jti": jti,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, jti


def create_refresh_token(user_uuid: str, expires_delta: Optional[timedelta] = None) -> tuple[str, str]:
    jti = secrets.token_urlsafe(16)
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(days=7))
    payload = {
        "sub": user_uuid,
        "type": "refresh",
        "jti": jti,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, jti


def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def store_token_record(db, jti: str, user_uuid: str, token_type: str, expires_at: datetime):
    from app.models import SessionToken

    token_record = SessionToken(
        token_jti=jti,
        user_uuid=user_uuid,
        token_type=token_type,
        expires_at=expires_at,
    )
    db.add(token_record)
    db.commit()


def revoke_token(db, jti: str):
    from app.models import SessionToken

    db.query(SessionToken).filter(SessionToken.token_jti == jti).delete()
    db.commit()


def revoke_all_user_tokens(db, user_uuid: str):
    from app.models import SessionToken

    db.query(SessionToken).filter(SessionToken.user_uuid == user_uuid).delete()
    db.commit()


def is_token_valid(db, jti: str) -> bool:
    from app.models import SessionToken

    record = db.query(SessionToken).filter(SessionToken.token_jti == jti).first()
    return record is not None
