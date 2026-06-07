from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List, Optional
from app.auth.limiter import limiter, READ_LIMIT, WRITE_LIMIT

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[schemas.LessonResponse])
@limiter.limit(READ_LIMIT)
def list_lessons(
    request: Request, curriculum_id: Optional[int] = None, db: Session = Depends(get_db)
):
    query = db.query(models.Lesson)
    if curriculum_id:
        query = query.filter(models.Lesson.curriculum_id == curriculum_id)
    return query.all()


@router.post("/", response_model=schemas.LessonResponse)
@limiter.limit(WRITE_LIMIT)
def create_lesson(
    request: Request, lesson: schemas.LessonCreate, db: Session = Depends(get_db)
):
    db_lesson = models.Lesson(**lesson.model_dump())
    db.add(db_lesson)
    db.commit()
    db.refresh(db_lesson)
    return db_lesson


@router.put("/{lesson_id}", response_model=schemas.LessonResponse)
@limiter.limit(WRITE_LIMIT)
def update_lesson(
    request: Request,
    lesson_id: int,
    lesson: schemas.LessonUpdate,
    db: Session = Depends(get_db),
):
    db_lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    for key, value in lesson.model_dump().items():
        setattr(db_lesson, key, value)

    db.commit()
    db.refresh(db_lesson)
    return db_lesson


@router.delete("/{lesson_id}")
@limiter.limit(WRITE_LIMIT)
def delete_lesson(request: Request, lesson_id: int, db: Session = Depends(get_db)):
    db_lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    db.delete(db_lesson)
    db.commit()
    return {"message": "Lesson deleted"}
