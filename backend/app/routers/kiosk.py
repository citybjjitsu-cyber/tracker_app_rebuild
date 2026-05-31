from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.routers.auth import get_current_user
from app.auth.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    CSRF_TOKEN_COOKIE_NAME,
)
from app.auth.jwt_utils import (
    create_access_token,
    create_refresh_token,
    store_token_record,
)
from app.auth.csrf import generate_csrf_token

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/verify-user-pin", response_model=schemas.KioskUserPinVerifyResponse)
def verify_user_pin(
    data: schemas.KioskUserPinVerifyRequest,
    db: Session = Depends(get_db),
):
    users = (
        db.query(models.User)
        .filter(
            models.User.pin_hash.isnot(None),
            models.User.is_current == True,
        )
        .all()
    )

    matched_user = None
    for user in users:
        if pwd_context.verify(data.pin, user.pin_hash):
            matched_user = user
            break

    if not matched_user:
        return schemas.KioskUserPinVerifyResponse(valid=False)

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

    return schemas.KioskUserPinVerifyResponse(
        valid=True,
        user=schemas.UserResponse.model_validate(matched_user),
        access_token=access_token,
        refresh_token=refresh_token,
        csrf_token=csrf_token,
    )


@router.post("/verify-pin")
def verify_pin(data: dict, db: Session = Depends(get_db)):
    pin = data.get("pin")

    kiosk = db.query(models.KioskAuth).first()
    if not kiosk:
        # Default PIN: 1234
        if pin == "1234":
            return {"valid": True}
        return {"valid": False}

    if pwd_context.verify(pin, kiosk.pin_hash):
        return {"valid": True}
    return {"valid": False}


@router.put("/update-pin")
def update_pin(
    data: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
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
def setup_kiosk(
    data: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
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
