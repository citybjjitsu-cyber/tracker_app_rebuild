import uuid
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Date,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_uuid = Column(String, unique=True, index=True, default=lambda: f"{datetime.now().timestamp()}")
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String)
    pin_hash = Column(String)
    rank = Column(String, default="White")
    rank_tier_id = Column(Integer, ForeignKey("rank_tiers.id"), nullable=True)
    last_graded_date = Column(Date)
    comments = Column(Text)
    nicknames = Column(String)
    profile_image_url = Column(String)
    image_offset_x = Column(Float, default=0.0)
    image_offset_y = Column(Float, default=0.0)
    is_current = Column(Boolean, default=True)
    effective_date = Column(DateTime, default=_utcnow)
    end_date = Column(DateTime)
    created_date = Column(DateTime, default=_utcnow)
    updated_date = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    @property
    def has_password(self):
        return self.password_hash is not None

    roles = relationship("UserRole", back_populates="user")
    attendance = relationship("Attendance", back_populates="user", foreign_keys="Attendance.user_uuid")
    feedback = relationship("ClassFeedback", back_populates="user", foreign_keys="ClassFeedback.user_uuid")
    comments_authored = relationship("Comment", back_populates="author", foreign_keys="Comment.author_uuid")
    comments_targeted = relationship("Comment", back_populates="target_user", foreign_keys="Comment.target_user_uuid")
    rank_tier = relationship("RankTier", foreign_keys=[rank_tier_id])


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)


class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True, index=True)
    user_uuid = Column(String, ForeignKey("users.user_uuid"))
    role_id = Column(Integer, ForeignKey("roles.id"))
    is_current = Column(Boolean, default=True)
    effective_date = Column(DateTime, default=_utcnow)
    end_date = Column(DateTime)
    created_date = Column(DateTime, default=_utcnow)
    updated_date = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    user = relationship("User", back_populates="roles")
    role = relationship("Role")


class GymLocation(Base):
    __tablename__ = "gym_locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    address = Column(Text)


class ClassType(Base):
    __tablename__ = "class_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


class ClassSchedule(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    class_uuid = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    class_name = Column(String, nullable=False)
    day = Column(String)
    time = Column(String)
    description = Column(Text)
    points = Column(Float, default=1.0)
    gym_id = Column(Integer, ForeignKey("gym_locations.id"))
    class_type_id = Column(Integer, ForeignKey("class_types.id"))
    is_current = Column(Boolean, default=True)
    effective_date = Column(DateTime, default=_utcnow)
    end_date = Column(DateTime)
    created_date = Column(DateTime, default=_utcnow)

    gym = relationship("GymLocation")
    class_type = relationship("ClassType")
    attendance = relationship("Attendance", back_populates="class_schedule")
    curriculum = relationship("Curriculum", back_populates="class_schedule", uselist=False)


class RankTier(Base):
    __tablename__ = "rank_tiers"

    id = Column(Integer, primary_key=True, index=True)
    rank = Column(String, nullable=False)
    degree = Column(Integer, default=0)
    display_name = Column(String, nullable=False)
    target_points = Column(Float, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=_utcnow)


class PointsAdjustment(Base):
    __tablename__ = "points_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    user_uuid = Column(String, ForeignKey("users.user_uuid"), nullable=False)
    amount = Column(Float, nullable=False, default=0)
    reason = Column(String, nullable=False)
    reference_rank_tier_id = Column(Integer, ForeignKey("rank_tiers.id"), nullable=True)
    previous_rank_tier_id = Column(Integer, ForeignKey("rank_tiers.id"), nullable=True)
    new_rank_tier_id = Column(Integer, ForeignKey("rank_tiers.id"), nullable=True)
    notes = Column(Text)
    adjusted_by_uuid = Column(String, ForeignKey("users.user_uuid"), nullable=False)
    adjustment_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=_utcnow)

    user = relationship("User", foreign_keys=[user_uuid])
    adjusted_by = relationship("User", foreign_keys=[adjusted_by_uuid])
    reference_rank_tier = relationship("RankTier", foreign_keys=[reference_rank_tier_id])
    previous_rank_tier = relationship("RankTier", foreign_keys=[previous_rank_tier_id])
    new_rank_tier = relationship("RankTier", foreign_keys=[new_rank_tier_id])


class Term(Base):
    __tablename__ = "terms"

    id = Column(Integer, primary_key=True, index=True)
    term_name = Column(String, unique=True, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=_utcnow)

    targets = relationship("TermTarget", back_populates="term")


class TermTarget(Base):
    __tablename__ = "term_targets"

    id = Column(Integer, primary_key=True, index=True)
    term_id = Column(Integer, ForeignKey("terms.id"))
    rank = Column(String, nullable=False)
    target = Column(Float, nullable=False)

    term = relationship("Term", back_populates="targets")


class Curriculum(Base):
    __tablename__ = "curricula"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), unique=True)
    name = Column(String)
    description = Column(Text)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    class_schedule = relationship("ClassSchedule", back_populates="curriculum")
    lessons = relationship("Lesson", back_populates="curriculum")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    curriculum_id = Column(Integer, ForeignKey("curricula.id"))
    title = Column(String, nullable=False)
    description = Column(Text)
    lesson_plan_url = Column(String)
    video_folder_url = Column(String)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    curriculum = relationship("Curriculum", back_populates="lessons")


class ClassInstance(Base):
    __tablename__ = "class_instances"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    class_date = Column(Date, nullable=False)
    teacher_uuid = Column(String, ForeignKey("users.user_uuid"))
    lesson_id = Column(Integer, ForeignKey("lessons.id"))
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    attendance = relationship("Attendance", back_populates="class_instance")
    feedback = relationship("ClassFeedback", back_populates="class_instance")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_uuid = Column(String, ForeignKey("users.user_uuid"))
    class_id = Column(Integer, ForeignKey("classes.id"))
    class_instance_id = Column(Integer, ForeignKey("class_instances.id"))
    teacher_uuid = Column(String, ForeignKey("users.user_uuid"))
    user_role_id = Column(Integer, ForeignKey("user_roles.id"))
    attendance_date = Column(Date, default=lambda: _utcnow().date())
    created_at = Column(DateTime, default=_utcnow)
    status = Column(String, default="confirmed")
    confirmed_by = Column(String, ForeignKey("users.user_uuid"))
    confirmed_at = Column(DateTime)

    user = relationship("User", back_populates="attendance", foreign_keys=[user_uuid])
    class_schedule = relationship("ClassSchedule", back_populates="attendance")
    class_instance = relationship("ClassInstance", back_populates="attendance")
    feedback = relationship(
        "ClassFeedback",
        back_populates="attendance",
        uselist=False,
        foreign_keys="ClassFeedback.attendance_id",
    )


class ClassFeedback(Base):
    __tablename__ = "class_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_uuid = Column(String, ForeignKey("users.user_uuid"))
    attendance_id = Column(Integer, ForeignKey("attendance.id"))
    class_instance_id = Column(Integer, ForeignKey("class_instances.id"))
    rating = Column(String)
    comment = Column(Text)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    user = relationship("User", back_populates="feedback", foreign_keys=[user_uuid])
    attendance = relationship("Attendance", back_populates="feedback", foreign_keys=[attendance_id])
    class_instance = relationship("ClassInstance", back_populates="feedback")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    comment_uuid = Column(String, unique=True, index=True)
    parent_comment_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    author_uuid = Column(String, ForeignKey("users.user_uuid"))
    target_user_uuid = Column(String, ForeignKey("users.user_uuid"), nullable=True)
    content = Column(Text, nullable=False)
    rating = Column(String, nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    author = relationship("User", back_populates="comments_authored", foreign_keys=[author_uuid])
    target_user = relationship("User", back_populates="comments_targeted", foreign_keys=[target_user_uuid])
    parent = relationship("Comment", remote_side=[id], backref="replies")


class KioskAuth(Base):
    __tablename__ = "kiosk_auth"

    id = Column(Integer, primary_key=True, index=True)
    pin_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class SessionToken(Base):
    __tablename__ = "session_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_jti = Column(String, unique=True, index=True)
    user_uuid = Column(String, ForeignKey("users.user_uuid"))
    token_type = Column(String)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=_utcnow)


class WebsiteTheme(Base):
    __tablename__ = "website_themes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=False)
    config = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=_utcnow, index=True)
    actor_uuid = Column(String, index=True, nullable=True)
    action = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=False, index=True)
    resource_uuid = Column(String, nullable=True)
    detail = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    success = Column(Boolean, default=True)


class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)
