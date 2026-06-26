from sqlalchemy.orm import Session
from app import models
from datetime import datetime, timezone
from typing import Optional


def create_audit_log(
    db: Session,
    action: str,
    resource_type: str,
    actor_uuid: Optional[str] = None,
    resource_uuid: Optional[str] = None,
    detail: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
) -> models.AuditLog:
    entry = models.AuditLog(
        timestamp=datetime.now(timezone.utc),
        actor_uuid=actor_uuid,
        action=action,
        resource_type=resource_type,
        resource_uuid=resource_uuid,
        detail=detail,
        ip_address=ip_address,
        user_agent=user_agent,
        success=success,
    )
    db.add(entry)
    db.commit()
    return entry
