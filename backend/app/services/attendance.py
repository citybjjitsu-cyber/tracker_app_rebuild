from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app import models


def ensure_class_instance(
    db: Session,
    class_id: int,
    class_date: date,
    teacher_uuid: Optional[str] = None,
) -> Optional[models.ClassInstance]:
    instance = (
        db.query(models.ClassInstance)
        .filter(
            models.ClassInstance.class_id == class_id,
            models.ClassInstance.class_date == class_date,
        )
        .first()
    )
    if instance:
        if teacher_uuid and not instance.teacher_uuid:
            instance.teacher_uuid = teacher_uuid
        return instance

    class_schedule = db.query(models.ClassSchedule).filter(models.ClassSchedule.id == class_id).first()
    if not class_schedule:
        return None

    instance = models.ClassInstance(
        class_id=class_id,
        class_date=class_date,
        teacher_uuid=teacher_uuid,
    )
    db.add(instance)
    db.flush()
    return instance
