from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from app.database import SessionLocal
from app import models, schemas
from app.routers.auth import get_admin_user
from app.auth.limiter import limiter, READ_LIMIT, WRITE_LIMIT

router = APIRouter(tags=["Themes"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[schemas.ThemeResponse])
@limiter.limit(READ_LIMIT)
def list_themes(request: Request, db: Session = Depends(get_db)):
    return (
        db.query(models.WebsiteTheme)
        .order_by(models.WebsiteTheme.created_at.desc())
        .all()
    )


@router.get("/active", response_model=schemas.ThemeResponse)
@limiter.limit(READ_LIMIT)
def get_active_theme(request: Request, db: Session = Depends(get_db)):
    theme = (
        db.query(models.WebsiteTheme)
        .filter(models.WebsiteTheme.is_active)
        .first()
    )
    if not theme:
        raise HTTPException(status_code=404, detail="No active theme configured")
    return theme


@router.get("/{theme_id}", response_model=schemas.ThemeResponse)
@limiter.limit(READ_LIMIT)
def get_theme(request: Request, theme_id: int, db: Session = Depends(get_db)):
    theme = (
        db.query(models.WebsiteTheme).filter(models.WebsiteTheme.id == theme_id).first()
    )
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme


@router.post("/", response_model=schemas.ThemeResponse)
@limiter.limit(WRITE_LIMIT)
def create_theme(
    request: Request,
    theme: schemas.ThemeCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_admin_user),
):
    existing = (
        db.query(models.WebsiteTheme)
        .filter(models.WebsiteTheme.name == theme.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Theme with this name already exists"
        )
    db_theme = models.WebsiteTheme(
        name=theme.name,
        config=theme.config,
        is_active=theme.is_active,
    )
    db.add(db_theme)
    if theme.is_active:
        db.query(models.WebsiteTheme).filter(
            models.WebsiteTheme.id != db_theme.id
        ).update({"is_active": False})
    db.commit()
    db.refresh(db_theme)
    return db_theme


@router.put("/{theme_id}", response_model=schemas.ThemeResponse)
@limiter.limit(WRITE_LIMIT)
def update_theme(
    request: Request,
    theme_id: int,
    theme_update: schemas.ThemeUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_admin_user),
):
    db_theme = (
        db.query(models.WebsiteTheme).filter(models.WebsiteTheme.id == theme_id).first()
    )
    if not db_theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    if theme_update.name is not None:
        existing = (
            db.query(models.WebsiteTheme)
            .filter(
                models.WebsiteTheme.name == theme_update.name,
                models.WebsiteTheme.id != theme_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400, detail="Theme with this name already exists"
            )
        db_theme.name = theme_update.name
    if theme_update.config is not None:
        db_theme.config = theme_update.config
    if theme_update.is_active is not None:
        db_theme.is_active = theme_update.is_active
        if theme_update.is_active:
            db.query(models.WebsiteTheme).filter(
                models.WebsiteTheme.id != theme_id
            ).update({"is_active": False})
    db.commit()
    db.refresh(db_theme)
    return db_theme


@router.delete("/{theme_id}")
@limiter.limit(WRITE_LIMIT)
def delete_theme(
    request: Request,
    theme_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_admin_user),
):
    db_theme = (
        db.query(models.WebsiteTheme).filter(models.WebsiteTheme.id == theme_id).first()
    )
    if not db_theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    db.delete(db_theme)
    db.commit()
    return {"message": "Theme deleted successfully"}


@router.post("/{theme_id}/apply", response_model=schemas.ThemeResponse)
@limiter.limit(WRITE_LIMIT)
def apply_theme(
    request: Request,
    theme_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_admin_user),
):
    db_theme = (
        db.query(models.WebsiteTheme).filter(models.WebsiteTheme.id == theme_id).first()
    )
    if not db_theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    db.query(models.WebsiteTheme).update({"is_active": False})
    db_theme.is_active = True
    db.commit()
    db.refresh(db_theme)
    return db_theme
