from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import SessionLocal
from app import models, schemas
from typing import Optional
from app.routers.auth import get_admin_user
from app.auth.limiter import limiter, READ_LIMIT

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=schemas.AuditLogListResponse)
@limiter.limit(READ_LIMIT)
def list_audit_logs(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    actor_uuid: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    query = db.query(models.AuditLog)

    if action:
        query = query.filter(models.AuditLog.action == action)
    if resource_type:
        query = query.filter(models.AuditLog.resource_type == resource_type)
    if actor_uuid:
        query = query.filter(models.AuditLog.actor_uuid == actor_uuid)

    total = query.count()
    items = (
        query.order_by(desc(models.AuditLog.timestamp))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return schemas.AuditLogListResponse(
        items=[schemas.AuditLogResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/actions", response_model=list[str])
@limiter.limit(READ_LIMIT)
def list_audit_actions(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    results = (
        db.query(models.AuditLog.action)
        .distinct()
        .order_by(models.AuditLog.action)
        .all()
    )
    return [r[0] for r in results]


@router.get("/resource-types", response_model=list[str])
@limiter.limit(READ_LIMIT)
def list_audit_resource_types(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    results = (
        db.query(models.AuditLog.resource_type)
        .distinct()
        .order_by(models.AuditLog.resource_type)
        .all()
    )
    return [r[0] for r in results]
