import json
import os
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from app.routers.auth import get_admin_user
from app.auth.limiter import (
    limiter,
    READ_LIMIT,
    DB_EXPORT_LIMIT,
    DB_RESET_LIMIT,
    DB_RESTORE_LIMIT,
)

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


SENSITIVE_USER_COLUMNS = {"password_hash", "pin_hash"}


def _export_all_data(db: Session) -> dict:
    roles = db.query(models.Role).all()
    users = db.query(models.User).all()
    user_roles = db.query(models.UserRole).all()
    gyms = db.query(models.GymLocation).all()
    class_types = db.query(models.ClassType).all()
    classes = db.query(models.ClassSchedule).all()
    terms = db.query(models.Term).all()
    term_targets = db.query(models.TermTarget).all()
    curricula = db.query(models.Curriculum).all()
    lessons = db.query(models.Lesson).all()
    class_instances = db.query(models.ClassInstance).all()
    attendance = db.query(models.Attendance).all()
    feedback = db.query(models.ClassFeedback).all()
    news = db.query(models.News).all()
    themes = db.query(models.WebsiteTheme).all()
    kiosk = db.query(models.KioskAuth).all()
    comments = db.query(models.Comment).all()

    def serialize(obj, sensitive_columns=None):
        if obj is None:
            return None
        if hasattr(obj, "__table__"):
            result = {}
            for c in obj.__table__.columns:
                if sensitive_columns and c.name in sensitive_columns:
                    continue
                result[c.name] = serialize(getattr(obj, c.name))
            return result
        if isinstance(obj, (datetime,)):
            return obj.isoformat()
        if hasattr(obj, "isoformat"):
            return obj.isoformat()
        return obj

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "roles": [serialize(r) for r in roles],
        "users": [serialize(u, sensitive_columns=SENSITIVE_USER_COLUMNS) for u in users],
        "user_roles": [serialize(ur) for ur in user_roles],
        "gym_locations": [serialize(g) for g in gyms],
        "class_types": [serialize(ct) for ct in class_types],
        "classes": [serialize(c) for c in classes],
        "terms": [serialize(t) for t in terms],
        "term_targets": [serialize(tt) for tt in term_targets],
        "curricula": [serialize(cu) for cu in curricula],
        "lessons": [serialize(lesson) for lesson in lessons],
        "class_instances": [serialize(ci) for ci in class_instances],
        "attendance": [serialize(a) for a in attendance],
        "feedback": [serialize(f) for f in feedback],
        "news": [serialize(n) for n in news],
        "themes": [serialize(t) for t in themes],
        "kiosk": [serialize(k) for k in kiosk],
        "comments": [serialize(c) for c in comments],
    }


def _format_size(size_bytes: int) -> str:
    if size_bytes > 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    if size_bytes > 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes} B"


def _get_db_size(db: Session) -> str:
    from sqlalchemy import text

    url = str(db.get_bind().url)
    if url.startswith("sqlite"):
        db_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "ckb_tracker.db",
        )
        try:
            return _format_size(os.path.getsize(db_path))
        except OSError:
            return "N/A"
    else:
        try:
            row = db.execute(text("SELECT pg_database_size(current_database())")).scalar()
            return _format_size(int(row)) if row else "N/A"
        except Exception:
            return "N/A"


@router.get("/stats", response_model=schemas.DbStatsResponse)
@limiter.limit(READ_LIMIT)
def get_stats(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    size_str = _get_db_size(db)

    kiosk = db.query(models.KioskAuth).first()
    kiosk_pin_set = kiosk is not None

    return schemas.DbStatsResponse(
        total_users=db.query(models.User).filter(models.User.is_current).count(),
        total_classes=db.query(models.ClassSchedule).filter(models.ClassSchedule.is_current).count(),
        total_attendance=db.query(models.Attendance).count(),
        size=size_str,
        kiosk_pin_set=kiosk_pin_set,
    )


@router.get("/create-backup")
@limiter.limit(DB_EXPORT_LIMIT)
def create_backup(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    from fastapi.responses import JSONResponse

    data = _export_all_data(db)
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f"attachment; filename=backup-{date_str}.json"},
    )


ALLOWED_RESTORE_KEYS = {
    "exported_at",
    "roles",
    "users",
    "user_roles",
    "gym_locations",
    "class_types",
    "classes",
    "terms",
    "term_targets",
    "curricula",
    "lessons",
    "class_instances",
    "attendance",
    "feedback",
    "news",
    "themes",
    "kiosk",
    "comments",
}

ALLOWED_USER_COLUMNS = {
    "user_uuid",
    "first_name",
    "last_name",
    "email",
    "rank",
    "rank_tier_id",
    "nicknames",
    "comments",
    "last_graded_date",
    "created_date",
    "profile_image_url",
    "image_offset_x",
    "image_offset_y",
    "is_current",
}


@router.post("/restore")
@limiter.limit(DB_RESTORE_LIMIT)
def restore_database(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="File must be a JSON file")

    content = file.file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Invalid backup format")

    unknown_keys = set(data.keys()) - ALLOWED_RESTORE_KEYS
    if unknown_keys:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown fields in backup: {', '.join(sorted(unknown_keys))}",
        )

    # Truncate all tables in dependency order
    db.query(models.Comment).delete()
    db.query(models.ClassFeedback).delete()
    db.query(models.Attendance).delete()
    db.query(models.ClassInstance).delete()
    db.query(models.Lesson).delete()
    db.query(models.Curriculum).delete()
    db.query(models.TermTarget).delete()
    db.query(models.Term).delete()
    db.query(models.ClassSchedule).delete()
    db.query(models.ClassType).delete()
    db.query(models.GymLocation).delete()
    db.query(models.UserRole).delete()
    db.query(models.User).delete()
    db.query(models.Role).delete()
    db.query(models.KioskAuth).delete()
    db.query(models.SessionToken).delete()
    db.query(models.WebsiteTheme).delete()
    db.query(models.News).delete()

    model_map = {
        "roles": models.Role,
        "users": models.User,
        "user_roles": models.UserRole,
        "gym_locations": models.GymLocation,
        "class_types": models.ClassType,
        "classes": models.ClassSchedule,
        "terms": models.Term,
        "term_targets": models.TermTarget,
        "curricula": models.Curriculum,
        "lessons": models.Lesson,
        "class_instances": models.ClassInstance,
        "attendance": models.Attendance,
        "feedback": models.ClassFeedback,
        "news": models.News,
        "themes": models.WebsiteTheme,
        "kiosk": models.KioskAuth,
        "comments": models.Comment,
    }

    for key, model in model_map.items():
        for row_data in data.get(key, []):
            if not isinstance(row_data, dict):
                continue
            row_data.pop("id", None)
            if key == "users":
                row_data = {k: v for k, v in row_data.items() if k in ALLOWED_USER_COLUMNS}
            db.add(model(**row_data))

    db.commit()
    return {"message": "Database restored successfully"}


class _ResetRequest(BaseModel):
    mode: Optional[str] = None


@router.post("/reset")
@limiter.limit(DB_RESET_LIMIT)
def reset_database(
    request: Request,
    body: Optional[_ResetRequest] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    from sqlalchemy import text

    # Disable FK checks for the session (works on both SQLite and PostgreSQL)
    db.execute(text("SET session_replication_role = 'replica'"))
    db.execute(text("PRAGMA foreign_keys = OFF"))
    db.commit()

    # Drop all tables
    models.Base.metadata.drop_all(bind=db.get_bind())
    db.commit()

    # Re-enable FK checks
    db.execute(text("SET session_replication_role = 'origin'"))
    db.execute(text("PRAGMA foreign_keys = ON"))
    db.commit()

    # Rebuild schema from models (no subprocess/alembic needed)
    models.Base.metadata.create_all(bind=db.get_bind())
    db.commit()

    # Seed basic roles (skip if already exist)
    existing = {r.name for r in db.query(models.Role.name).all()}
    roles = [
        models.Role(name="Student", description="Member attending classes"),
        models.Role(name="Teacher", description="Instructor teaching classes"),
        models.Role(name="Admin", description="Administrator with full access"),
        models.Role(name="Tablet", description="Tablet/TV display kiosk"),
        models.Role(name="Lite-Admin", description="Limited admin access"),
    ]
    for role in roles:
        if role.name not in existing:
            db.add(role)
    db.commit()

    return {"message": "Database reset complete"}
