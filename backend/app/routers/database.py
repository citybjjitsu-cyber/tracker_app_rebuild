import json
import os
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
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

    def serialize(obj):
        if obj is None:
            return None
        if hasattr(obj, "__table__"):
            return {c.name: serialize(getattr(obj, c.name)) for c in obj.__table__.columns}
        if isinstance(obj, (datetime,)):
            return obj.isoformat()
        if hasattr(obj, "isoformat"):
            return obj.isoformat()
        return obj

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "roles": [serialize(r) for r in roles],
        "users": [serialize(u) for u in users],
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


@router.get("/stats", response_model=schemas.DbStatsResponse)
@limiter.limit(READ_LIMIT)
def get_stats(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ckb_tracker.db")
    try:
        size_bytes = os.path.getsize(db_path)
        if size_bytes > 1024 * 1024:
            size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
        elif size_bytes > 1024:
            size_str = f"{size_bytes / 1024:.1f} KB"
        else:
            size_str = f"{size_bytes} B"
    except OSError:
        size_str = "N/A"

    kiosk = db.query(models.KioskAuth).first()
    kiosk_pin_set = kiosk is not None

    return schemas.DbStatsResponse(
        total_users=db.query(models.User).filter(models.User.is_current).count(),
        total_classes=db.query(models.ClassSchedule).filter(models.ClassSchedule.is_current).count(),
        total_attendance=db.query(models.Attendance).count(),
        size=size_str,
        kiosk_pin_set=kiosk_pin_set,
    )


@router.get("/export-seed")
@limiter.limit(DB_EXPORT_LIMIT)
def export_seed(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    from fastapi.responses import JSONResponse

    data = _export_all_data(db)
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": "attachment; filename=seed-data.json"},
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
            row_data.pop("id", None)
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
    mode = body.mode if body else None
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)

    # Seed basic roles
    roles = [
        models.Role(name="Student", description="Member attending classes"),
        models.Role(name="Teacher", description="Instructor teaching classes"),
        models.Role(name="Admin", description="Administrator with full access"),
    ]
    for role in roles:
        db.add(role)
    db.commit()

    if mode == "seed":
        import importlib

        seed_module = importlib.import_module("seed_complete_data")
        seed_module.seed_data()
        db.commit()
        return {"message": "Database reset and seeded with demo data"}
    else:
        return {"message": "Database reset (roles only kept)"}
