from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from datetime import date, timedelta
from typing import List, Optional
from app.auth.limiter import limiter, READ_LIMIT, WRITE_LIMIT

router = APIRouter()

WEEK_DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
DAY_ALIASES = {
    "mon": "Monday",
    "monday": "Monday",
    "tue": "Tuesday",
    "tues": "Tuesday",
    "tuesday": "Tuesday",
    "wed": "Wednesday",
    "wednesday": "Wednesday",
    "thu": "Thursday",
    "thur": "Thursday",
    "thurs": "Thursday",
    "thursday": "Thursday",
    "fri": "Friday",
    "friday": "Friday",
    "sat": "Saturday",
    "saturday": "Saturday",
    "sun": "Sunday",
    "sunday": "Sunday",
}


def normalize_day(day: Optional[str]) -> Optional[str]:
    return DAY_ALIASES.get(day.strip().lower()) if day else None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.ClassScheduleResponse)
@limiter.limit(WRITE_LIMIT)
def create_class(request: Request, cls: schemas.ClassScheduleCreate, db: Session = Depends(get_db)):
    db_class = models.ClassSchedule(**cls.model_dump())
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class


@router.get("/", response_model=List[schemas.ClassScheduleResponse])
@limiter.limit(READ_LIMIT)
def list_classes(request: Request, db: Session = Depends(get_db)):
    return db.query(models.ClassSchedule).filter(models.ClassSchedule.is_current).all()


@router.get("/weekly", response_model=schemas.WeeklyScheduleResponse)
@limiter.limit(READ_LIMIT)
def get_weekly_schedule(
    request: Request,
    week_start: Optional[date] = None,
    db: Session = Depends(get_db),
):
    requested_start = week_start or date.today()
    monday = requested_start - timedelta(days=requested_start.weekday())
    week_dates = [monday + timedelta(days=index) for index in range(7)]
    days = [{"day": day, "date": scheduled_date, "classes": []} for day, scheduled_date in zip(WEEK_DAYS, week_dates)]
    day_indexes = {day: index for index, day in enumerate(WEEK_DAYS)}

    classes = db.query(models.ClassSchedule).filter(models.ClassSchedule.is_current).all()
    for cls in classes:
        normalized_day = normalize_day(cls.day)
        if normalized_day is None:
            continue
        day_index = day_indexes[normalized_day]
        class_data = schemas.ClassScheduleResponse.model_validate(cls).model_dump()
        class_data["scheduled_date"] = week_dates[day_index]
        days[day_index]["classes"].append(class_data)

    for day in days:
        day["classes"].sort(key=lambda item: (item.get("time") or "", item["class_name"]))

    return {
        "week_start": monday,
        "week_end": week_dates[-1],
        "days": days,
    }


@router.get("/{class_id}", response_model=schemas.ClassScheduleResponse)
@limiter.limit(READ_LIMIT)
def get_class(request: Request, class_id: int, db: Session = Depends(get_db)):
    cls = (
        db.query(models.ClassSchedule)
        .filter(models.ClassSchedule.id == class_id, models.ClassSchedule.is_current)
        .first()
    )
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return cls


@router.put("/{class_uuid}", response_model=schemas.ClassScheduleResponse)
@limiter.limit(WRITE_LIMIT)
def update_class(
    request: Request,
    class_uuid: str,
    cls: schemas.ClassScheduleUpdate,
    db: Session = Depends(get_db),
):
    db_class = (
        db.query(models.ClassSchedule)
        .filter(
            models.ClassSchedule.class_uuid == class_uuid,
            models.ClassSchedule.is_current,
        )
        .first()
    )
    if not db_class:
        raise HTTPException(status_code=404, detail="Class not found")

    for key, value in cls.model_dump().items():
        setattr(db_class, key, value)

    db.commit()
    db.refresh(db_class)
    return db_class
