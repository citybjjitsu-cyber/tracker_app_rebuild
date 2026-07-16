from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session, joinedload
from app.database import SessionLocal
from app import models, schemas
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional
from collections import defaultdict
import time
from app.routers.auth import (
    get_current_user,
    get_admin_user,
    set_auth_cookies,
    verify_password,
    get_user_roles,
)
from app.auth.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from app.auth.jwt_utils import (
    create_access_token,
    create_refresh_token,
    store_token_record,
    revoke_all_user_tokens,
)
from app.auth.csrf import generate_csrf_token
from app.auth.limiter import limiter, AUTH_LIMIT, PIN_LIMIT, REGISTRATION_LIMIT
from app.services.audit import create_audit_log

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# PIN lockout tracking (in-memory, keyed by client IP)
PIN_ATTEMPTS: dict[str, list[float]] = defaultdict(list)
MAX_FAILED_ATTEMPTS = 3
LOCKOUT_DURATION = 300  # 5 minutes


def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def check_pin_lockout(ip: str) -> Optional[int]:
    now = time.time()
    attempts = PIN_ATTEMPTS.get(ip, [])
    attempts = [t for t in attempts if now - t < LOCKOUT_DURATION]
    PIN_ATTEMPTS[ip] = attempts
    if len(attempts) >= MAX_FAILED_ATTEMPTS:
        remaining = int(LOCKOUT_DURATION - (now - attempts[-1]))
        return max(remaining, 0)
    return None


def record_failed_attempt(ip: str):
    PIN_ATTEMPTS[ip].append(time.time())


def clear_pin_lockout(ip: str):
    PIN_ATTEMPTS.pop(ip, None)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/unlock", response_model=schemas.KioskUnlockResponse)
@limiter.limit(AUTH_LIMIT)
def kiosk_unlock(
    request: Request,
    data: schemas.LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .options(joinedload(models.User.rank_tier))
        .filter(models.User.email == data.email, models.User.is_current)
        .first()
    )

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    roles = get_user_roles(db, user.user_uuid)
    role_names = [r["name"] for r in roles]
    if "Kiosk" not in role_names:
        raise HTTPException(status_code=403, detail="Kiosk service account required to unlock kiosk")

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

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="kiosk_unlock",
        resource_type="kiosk",
        actor_uuid=str(user.user_uuid),
        detail="Kiosk unlocked",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return schemas.KioskUnlockResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=schemas.KioskUserResponse.model_validate(user),
        roles=[schemas.RoleResponse.model_validate(r) for r in roles],
    )


@router.post("/lock")
@limiter.limit(AUTH_LIMIT)
def kiosk_lock(
    request: Request,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    revoke_all_user_tokens(db, user.user_uuid)

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="kiosk_lock",
        resource_type="kiosk",
        actor_uuid=str(user.user_uuid),
        detail="Kiosk locked",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {"message": "Kiosk locked"}


@router.post("/verify-user-pin", response_model=schemas.KioskUserPinVerifyResponse)
@limiter.limit(PIN_LIMIT)
def verify_user_pin(
    request: Request,
    data: schemas.KioskUserPinVerifyRequest,
    db: Session = Depends(get_db),
    kiosk_user: models.User = Depends(get_current_user),
):
    client_ip = _get_client_ip(request)
    remaining = check_pin_lockout(client_ip)
    if remaining is not None:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {remaining} seconds.",
            headers={"Retry-After": str(remaining)},
        )

    users = (
        db.query(models.User)
        .options(joinedload(models.User.rank_tier))
        .filter(
            models.User.pin_hash.isnot(None),
            models.User.is_current,
        )
        .all()
    )

    matched_user = None
    for user in users:
        if pwd_context.verify(data.pin, user.pin_hash):
            matched_user = user
            break

    client_host = _get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    if not matched_user:
        record_failed_attempt(client_ip)
        create_audit_log(
            db,
            action="pin_verify_failed",
            resource_type="kiosk",
            actor_uuid=str(kiosk_user.user_uuid),
            detail="PIN verification failed",
            ip_address=client_host,
            user_agent=user_agent,
            success=False,
        )
        return schemas.KioskUserPinVerifyResponse(valid=False)

    clear_pin_lockout(client_ip)

    access_token, access_jti = create_access_token(matched_user.user_uuid)
    refresh_token, refresh_jti = create_refresh_token(matched_user.user_uuid)

    store_token_record(
        db,
        access_jti,
        matched_user.user_uuid,
        "access",
        datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    store_token_record(
        db,
        refresh_jti,
        matched_user.user_uuid,
        "refresh",
        datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )

    csrf_token = generate_csrf_token()

    create_audit_log(
        db,
        action="pin_verify_success",
        resource_type="kiosk",
        actor_uuid=str(kiosk_user.user_uuid),
        resource_uuid=str(matched_user.user_uuid),
        detail="PIN verification successful",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return schemas.KioskUserPinVerifyResponse(
        valid=True,
        user=schemas.KioskUserResponse.model_validate(matched_user),
        access_token=access_token,
        refresh_token=refresh_token,
        csrf_token=csrf_token,
    )


@router.post("/verify-pin-for-user")
@limiter.limit(PIN_LIMIT)
def verify_pin_for_user(
    request: Request,
    data: schemas.KioskUserPinVerifyForUserRequest,
    response: Response,
    db: Session = Depends(get_db),
    kiosk_user: models.User = Depends(get_current_user),
):
    client_ip = _get_client_ip(request)
    lockout_key = f"ip:{client_ip}"
    remaining = check_pin_lockout(lockout_key)
    if remaining is not None:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {remaining} seconds.",
            headers={"Retry-After": str(remaining)},
        )

    user = (
        db.query(models.User)
        .options(joinedload(models.User.rank_tier))
        .filter(
            models.User.user_uuid == data.user_uuid,
            models.User.is_current,
        )
        .first()
    )

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")

    if not user or not user.pin_hash:
        create_audit_log(
            db,
            action="pin_for_user_failed",
            resource_type="kiosk",
            actor_uuid=str(kiosk_user.user_uuid),
            resource_uuid=data.user_uuid,
            detail="PIN for user failed: no PIN set",
            ip_address=client_host,
            user_agent=user_agent,
            success=False,
        )
        return {"valid": False}

    if pwd_context.verify(data.pin, user.pin_hash):
        clear_pin_lockout(lockout_key)

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

        create_audit_log(
            db,
            action="pin_for_user_success",
            resource_type="kiosk",
            actor_uuid=str(kiosk_user.user_uuid),
            resource_uuid=data.user_uuid,
            detail="PIN for user successful",
            ip_address=client_host,
            user_agent=user_agent,
        )

        return {
            "valid": True,
            "csrf_token": csrf_token,
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    record_failed_attempt(lockout_key)
    create_audit_log(
        db,
        action="pin_for_user_failed",
        resource_type="kiosk",
        actor_uuid=str(kiosk_user.user_uuid),
        resource_uuid=data.user_uuid,
        detail="PIN for user failed: wrong PIN",
        ip_address=client_host,
        user_agent=user_agent,
        success=False,
    )
    return {"valid": False}


@router.post("/verify-pin")
@limiter.limit(PIN_LIMIT)
def verify_pin(request: Request, data: dict, db: Session = Depends(get_db)):
    pin = data.get("pin")
    lockout_key = "legacy-kiosk"

    remaining = check_pin_lockout(lockout_key)
    if remaining is not None:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {remaining} seconds.",
            headers={"Retry-After": str(remaining)},
        )

    kiosk = db.query(models.KioskAuth).first()
    if not kiosk:
        record_failed_attempt(lockout_key)
        return {"valid": False}

    if pwd_context.verify(pin, kiosk.pin_hash):
        clear_pin_lockout(lockout_key)
        return {"valid": True}

    record_failed_attempt(lockout_key)
    return {"valid": False}


@router.put("/update-pin")
@limiter.limit(PIN_LIMIT)
def update_pin(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    current_pin = data.get("current_pin")
    new_pin = data.get("new_pin")

    kiosk = db.query(models.KioskAuth).first()

    if not kiosk:
        # Create new kiosk auth
        if current_pin != "1234":
            raise HTTPException(status_code=400, detail="Invalid current PIN")
        kiosk = models.KioskAuth(pin_hash=pwd_context.hash(new_pin))
        db.add(kiosk)
    else:
        if not pwd_context.verify(current_pin, kiosk.pin_hash):
            raise HTTPException(status_code=400, detail="Invalid current PIN")
        kiosk.pin_hash = pwd_context.hash(new_pin)

    db.commit()
    return {"message": "PIN updated"}


@router.post("/setup")
@limiter.limit(REGISTRATION_LIMIT)
def setup_kiosk(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    pin = data.get("pin", "1234")

    kiosk = db.query(models.KioskAuth).first()
    if kiosk:
        kiosk.pin_hash = pwd_context.hash(pin)
    else:
        kiosk = models.KioskAuth(pin_hash=pwd_context.hash(pin))
        db.add(kiosk)

    db.commit()
    return {"message": "Kiosk configured"}
