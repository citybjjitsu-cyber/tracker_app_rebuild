from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import SessionLocal
from app import models, schemas
from app.routers.auth import get_admin_user

router = APIRouter(prefix="/news", tags=["news"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[schemas.NewsResponse])
def list_news(db: Session = Depends(get_db), published_only: bool = True):
    query = db.query(models.News)
    if published_only:
        query = query.filter(models.News.is_published == True)
    return query.order_by(models.News.created_at.desc()).all()


@router.post("/", response_model=schemas.NewsResponse)
def create_news(
    news: schemas.NewsCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_admin_user),
):
    db_news = models.News(
        title=news.title,
        content=news.content,
        is_published=news.is_published,
    )
    db.add(db_news)
    db.commit()
    db.refresh(db_news)
    return db_news


@router.get("/{news_id}", response_model=schemas.NewsResponse)
def get_news(news_id: int, db: Session = Depends(get_db)):
    news = db.query(models.News).filter(models.News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    return news


@router.put("/{news_id}", response_model=schemas.NewsResponse)
def update_news(
    news_id: int,
    news_update: schemas.NewsUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_admin_user),
):
    news = db.query(models.News).filter(models.News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    if news_update.title is not None:
        news.title = news_update.title
    if news_update.content is not None:
        news.content = news_update.content
    if news_update.is_published is not None:
        news.is_published = news_update.is_published

    db.commit()
    db.refresh(news)
    return news


@router.delete("/{news_id}")
def delete_news(
    news_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_admin_user),
):
    news = db.query(models.News).filter(models.News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    db.delete(news)
    db.commit()
    return {"message": "News deleted successfully"}
