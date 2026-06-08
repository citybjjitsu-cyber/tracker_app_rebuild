from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    Request,
    Cookie,
    Header,
    status,
)
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from app.auth.limiter import limiter, AUTH_LIMIT, REFRESH_LIMIT, WRITE_LIMIT, READ_LIMIT
import logging

from app.auth.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    MAX_SESSION_HOURS,
    COOKIE_HTTPONLY,
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    CSRF_TOKEN_COOKIE_NAME,
)
from app.auth.jwt_utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
    store_token_record,
    revoke_token,
    revoke_all_user_tokens,
    is_token_valid,
)
from app.auth.csrf import generate_csrf_token
from app.services.audit import create_audit_log

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def get_user_roles(db, user_uuid: str) -> List[dict]:
    user_roles = (
        db.query(models.UserRole)
        .filter(
            models.UserRole.user_uuid == user_uuid, models.UserRole.is_current == True
        )
        .all()
    )
    roles = []
    for ur in user_roles:
        role = db.query(models.Role).filter(models.Role.id == ur.role_id).first()
        if role:
            roles.append(
                {
                    "id": int(role.id),
                    "name": str(role.name),
                    "description": str(role.description) if role.description else None,
                }
            )
    return roles


def get_current_user(
    access_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if not access_token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            access_token = parts[1]

    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    jti = payload.get("jti")
    if not is_token_valid(db, jti):
        raise HTTPException(status_code=401, detail="Token revoked")

    user_uuid = payload.get("sub")
    user = (
        db.query(models.User)
        .filter(models.User.user_uuid == user_uuid, models.User.is_current == True)
        .first()
    )

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def get_admin_user(
    user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    user_role = (
        db.query(models.UserRole)
        .filter(
            models.UserRole.user_uuid == user.user_uuid,
            models.UserRole.is_current == True,
        )
        .join(models.Role)
        .filter(models.Role.name == "Admin")
        .first()
    )
    if not user_role:
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


def set_auth_cookies(
    response: Response, access_token: str, refresh_token: str, csrf_token: str
):
    access_expire = ACCESS_TOKEN_EXPIRE_MINUTES * 60
    refresh_expire = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=access_expire,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=refresh_expire,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        path="/auth/refresh",
    )
    response.set_cookie(
        key=CSRF_TOKEN_COOKIE_NAME,
        value=csrf_token,
        max_age=access_expire,
        httponly=False,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        path="/",
    )


def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/auth/refresh")
    response.delete_cookie(CSRF_TOKEN_COOKIE_NAME, path="/")


@router.post("/login")
@limiter.limit(AUTH_LIMIT)
def login(
    request: Request,
    data: schemas.LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(models.User.email == data.email, models.User.is_current == True)
        .first()
    )

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    roles = get_user_roles(db, user.user_uuid)

    access_token, access_jti = create_access_token(user.user_uuid)
    refresh_token, refresh_jti = create_refresh_token(user.user_uuid)

    store_token_record(
        db,
        access_jti,
        user.user_uuid,
        "access",
        datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    store_token_record(
        db,
        refresh_jti,
        user.user_uuid,
        "refresh",
        datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )

    csrf_token = generate_csrf_token()
    set_auth_cookies(response, access_token, refresh_token, csrf_token)

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="login",
        resource_type="auth",
        actor_uuid=str(user.user_uuid),
        detail="User login",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {
        "user": schemas.UserResponse.model_validate(user),
        "roles": roles,
        "csrf_token": csrf_token,
    }


@router.post("/teacher-login")
@limiter.limit(AUTH_LIMIT)
def teacher_login(
    request: Request,
    data: schemas.LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(models.User.email == data.email, models.User.is_current == True)
        .first()
    )

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    roles = get_user_roles(db, user.user_uuid)
    is_teacher = any(r["name"] == "Teacher" for r in roles)
    is_admin = any(r["name"] == "Admin" for r in roles)

    if not is_teacher and not is_admin:
        raise HTTPException(status_code=403, detail="Teacher role required")

    access_token, access_jti = create_access_token(user.user_uuid)
    refresh_token, refresh_jti = create_refresh_token(user.user_uuid)

    store_token_record(
        db,
        access_jti,
        user.user_uuid,
        "access",
        datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    store_token_record(
        db,
        refresh_jti,
        user.user_uuid,
        "refresh",
        datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )

    csrf_token = generate_csrf_token()
    set_auth_cookies(response, access_token, refresh_token, csrf_token)

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="teacher_login",
        resource_type="auth",
        actor_uuid=str(user.user_uuid),
        detail="Teacher login",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {
        "user": schemas.UserResponse.model_validate(user),
        "roles": roles,
        "csrf_token": csrf_token,
    }


@router.post("/refresh")
@limiter.limit(REFRESH_LIMIT)
def refresh_token(
    request: Request,
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token required")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    jti = payload.get("jti")
    if not is_token_valid(db, jti):
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    user_uuid = payload.get("sub")
    user = (
        db.query(models.User)
        .filter(models.User.user_uuid == user_uuid, models.User.is_current == True)
        .first()
    )

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Enforce absolute session expiry
    iat = payload.get("iat")
    if iat:
        issued_at = datetime.fromtimestamp(iat, tz=timezone.utc)
        if datetime.now(timezone.utc) - issued_at > timedelta(hours=MAX_SESSION_HOURS):
            revoke_token(db, jti)
            raise HTTPException(
                status_code=401, detail="Session expired, please log in again"
            )

    # Revoke old refresh token (rotation)
    revoke_token(db, jti)

    roles = get_user_roles(db, user_uuid)

    access_token, access_jti = create_access_token(user_uuid)
    new_refresh_token, refresh_jti = create_refresh_token(user_uuid)

    store_token_record(
        db,
        access_jti,
        user_uuid,
        "access",
        datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    store_token_record(
        db,
        refresh_jti,
        user_uuid,
        "refresh",
        datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )

    csrf_token = generate_csrf_token()
    set_auth_cookies(response, access_token, new_refresh_token, csrf_token)

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="token_refresh",
        resource_type="auth",
        actor_uuid=str(user_uuid),
        detail="Token refreshed",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {
        "user": schemas.UserResponse.model_validate(user),
        "roles": roles,
        "csrf_token": csrf_token,
    }


@router.post("/logout")
@limiter.limit(WRITE_LIMIT)
def logout(
    response: Response,
    request: Request,
    access_token: Optional[str] = Cookie(None),
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if access_token:
        payload = decode_token(access_token)
        if payload and payload.get("jti"):
            revoke_token(db, payload.get("jti"))

    if refresh_token:
        payload = decode_token(refresh_token)
        if payload and payload.get("jti"):
            revoke_token(db, payload.get("jti"))

    clear_auth_cookies(response)

    payload = decode_token(access_token) if access_token else None
    actor_uuid = str(payload.get("sub")) if payload else None
    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="logout",
        resource_type="auth",
        actor_uuid=actor_uuid,
        detail="User logout",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {"message": "Logged out successfully"}


@router.post("/logout-all")
@limiter.limit(WRITE_LIMIT)
def logout_all(
    request: Request,
    response: Response,
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    if access_token:
        payload = decode_token(access_token)
        if payload and payload.get("sub"):
            revoke_all_user_tokens(db, payload.get("sub"))

    clear_auth_cookies(response)

    payload = decode_token(access_token) if access_token else None
    actor_uuid = str(payload.get("sub")) if payload else None
    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="logout_all",
        resource_type="auth",
        actor_uuid=actor_uuid,
        detail="Logged out from all devices",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {"message": "Logged out from all devices"}


@router.get("/me")
@limiter.limit(READ_LIMIT)
def get_current_user_info(
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    roles = get_user_roles(db, user.user_uuid)
    csrf_token = generate_csrf_token()
    response = {
        "user": schemas.UserResponse.model_validate(user),
        "roles": roles,
        "csrf_token": csrf_token,
    }

    class MockResponse:
        def set_cookie(self, key, value, max_age, httponly, samesite, secure, path):
            pass

    set_auth_cookies(MockResponse(), "", "", csrf_token)

    return response


@router.get("/check-password/{user_uuid}")
@limiter.limit(READ_LIMIT)
def check_password(
    request: Request,
    user_uuid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = db.query(models.User).filter(models.User.user_uuid == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"has_password": user.password_hash is not None}


@router.get("/csrf-token")
@limiter.limit(READ_LIMIT)
def get_csrf_token(request: Request, csrf_token: Optional[str] = Cookie(None)):
    if not csrf_token:
        return {"csrf_token": generate_csrf_token()}
    return {"csrf_token": csrf_token}
