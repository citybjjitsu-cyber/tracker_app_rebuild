from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette.requests import Request as StarRequest

from app import models, schemas
from app.auth.limiter import INVITE_LIMIT, READ_LIMIT, WRITE_LIMIT, limiter
from app.database import SessionLocal
from app.routers.auth import get_admin_user, get_lite_admin_user
from app.services.audit import create_audit_log
from app.services.email import (
    resolve_base_url,
    send_password_reset_email,
    send_pin_reset_email,
    send_test_email,
)
from app.auth.jwt_utils import hash_token
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import List
import secrets


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


router = APIRouter(prefix="/admin", tags=["Admin"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/seed")
@limiter.limit("1/minute")
def seed_database(
    request: StarRequest,
    user: models.User = Depends(get_admin_user),
):
    try:
        from seed_complete_data import seed_data

        seed_data()
        return {"message": "Database seeded successfully"}
    except Exception as e:
        import logging

        logging.error(f"Seed failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invites", response_model=List[schemas.InviteListResponse])
@limiter.limit(READ_LIMIT)
def list_invites(
    request: StarRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_lite_admin_user),
):
    invites = db.query(models.InviteToken).order_by(models.InviteToken.created_at.desc()).limit(100).all()

    result = []
    for inv in invites:
        user = db.query(models.User).filter(models.User.user_uuid == inv.user_uuid).first()
        result.append(
            schemas.InviteListResponse(
                id=inv.id,
                user_uuid=inv.user_uuid,
                user_name=f"{user.first_name} {user.last_name}" if user else "Unknown",
                user_email=user.email if user else "Unknown",
                expires_at=inv.expires_at,
                consumed_at=inv.consumed_at,
                sent_count=inv.sent_count or 0,
                created_at=inv.created_at,
            )
        )
    return result


@router.delete("/invites/{invite_id}")
@limiter.limit(WRITE_LIMIT)
def revoke_invite(
    request: StarRequest,
    invite_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_lite_admin_user),
):
    invite = db.query(models.InviteToken).filter(models.InviteToken.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    if invite.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Cannot revoke a consumed invite")

    db.delete(invite)
    db.commit()

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="invite_revoked",
        resource_type="user",
        actor_uuid=str(admin.user_uuid),
        resource_uuid=invite.user_uuid,
        detail="Invite revoked",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {"message": "Invite revoked"}


@router.post("/users/{user_uuid}/reset-password")
@limiter.limit(INVITE_LIMIT)
def admin_reset_password(
    request: StarRequest,
    user_uuid: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_lite_admin_user),
):
    user = db.query(models.User).filter(models.User.user_uuid == user_uuid, models.User.is_current).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = secrets.token_urlsafe(48)
    token_hash_val = hash_token(token)
    expires_at = _utcnow() + timedelta(hours=1)

    reset = models.ResetToken(
        token_hash=token_hash_val,
        user_uuid=user.user_uuid,
        purpose="password",
        expires_at=expires_at,
    )
    db.add(reset)
    db.commit()

    email_sent = send_password_reset_email(user.email, user.first_name, token, resolve_base_url(request))

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="password_reset_admin",
        resource_type="user",
        actor_uuid=str(admin.user_uuid),
        resource_uuid=user_uuid,
        detail=f"Admin-initiated password reset (email_delivered={email_sent})",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {"message": "Password reset email sent" if email_sent else "Password reset email queued but delivery failed"}


@router.post("/users/{user_uuid}/reset-pin")
@limiter.limit(INVITE_LIMIT)
def admin_reset_pin(
    request: StarRequest,
    user_uuid: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_lite_admin_user),
):
    user = db.query(models.User).filter(models.User.user_uuid == user_uuid, models.User.is_current).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = secrets.token_urlsafe(48)
    token_hash_val = hash_token(token)
    expires_at = _utcnow() + timedelta(hours=1)

    reset = models.ResetToken(
        token_hash=token_hash_val,
        user_uuid=user.user_uuid,
        purpose="pin",
        expires_at=expires_at,
    )
    db.add(reset)
    db.commit()

    email_sent = send_pin_reset_email(user.email, user.first_name, token, resolve_base_url(request))

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="pin_reset_admin",
        resource_type="user",
        actor_uuid=str(admin.user_uuid),
        resource_uuid=user_uuid,
        detail=f"Admin-initiated PIN reset (email_delivered={email_sent})",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {"message": "PIN reset email sent" if email_sent else "PIN reset email queued but delivery failed"}


@router.post("/test-email")
@limiter.limit(INVITE_LIMIT)
def test_email(
    request: StarRequest,
    body: schemas.TestEmailRequest,
    admin: models.User = Depends(get_lite_admin_user),
):
    sent = send_test_email(body.email)
    if sent:
        return {"message": f"Test email sent to {body.email}"}
    raise HTTPException(status_code=502, detail=f"SMTP not configured or failed to send to {body.email}")


@router.post("/users/{user_uuid}/toggle-active")
@limiter.limit(WRITE_LIMIT)
def toggle_user_active(
    request: StarRequest,
    user_uuid: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_lite_admin_user),
):
    user = db.query(models.User).filter(models.User.user_uuid == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.user_uuid == admin.user_uuid:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user.is_current = not user.is_current
    if not user.is_current:
        user.end_date = _utcnow()
    else:
        user.end_date = None
        user.effective_date = _utcnow()
    db.commit()
    db.refresh(user)

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    action = "user_deactivated" if not user.is_current else "user_activated"
    create_audit_log(
        db,
        action=action,
        resource_type="user",
        actor_uuid=str(admin.user_uuid),
        resource_uuid=user_uuid,
        detail=f"User {'deactivated' if not user.is_current else 'activated'}: {user.first_name} {user.last_name}",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {"is_current": user.is_current, "message": f"User {'activated' if user.is_current else 'deactivated'}"}
