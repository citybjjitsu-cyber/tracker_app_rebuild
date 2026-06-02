from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional, List


class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    rank: Optional[str] = "White"
    nicknames: Optional[str] = None
    comments: Optional[str] = None
    last_graded_date: Optional[date] = None


class UserCreate(UserBase):
    password: Optional[str] = None
    pin: Optional[str] = None
    profile_image_url: Optional[str] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    rank: Optional[str] = None
    nicknames: Optional[str] = None
    comments: Optional[str] = None
    last_graded_date: Optional[date] = None
    password: Optional[str] = None
    pin: Optional[str] = None


class UserResponse(UserBase):
    user_uuid: str
    password_hash: Optional[str] = None
    pin_hash: Optional[str] = None
    profile_image_url: Optional[str] = None
    image_offset_x: Optional[float] = None
    image_offset_y: Optional[float] = None
    end_date: Optional[datetime] = None
    is_current: bool
    effective_date: datetime
    created_date: datetime
    updated_date: datetime

    class Config:
        from_attributes = True


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class UserRoleResponse(BaseModel):
    id: int
    user_uuid: str
    role_id: int
    is_current: bool
    effective_date: datetime
    role: Optional[RoleResponse] = None

    class Config:
        from_attributes = True


class GymLocationBase(BaseModel):
    name: str
    address: Optional[str] = None


class GymLocationCreate(GymLocationBase):
    pass


class GymLocationResponse(GymLocationBase):
    id: int

    class Config:
        from_attributes = True


class ClassTypeBase(BaseModel):
    name: str


class ClassTypeCreate(ClassTypeBase):
    pass


class ClassTypeResponse(ClassTypeBase):
    id: int

    class Config:
        from_attributes = True


class ClassScheduleBase(BaseModel):
    class_name: str
    day: Optional[str] = None
    time: Optional[str] = None
    description: Optional[str] = None
    points: float = 1.0
    gym_id: Optional[int] = None
    class_type_id: Optional[int] = None


class ClassScheduleCreate(ClassScheduleBase):
    pass


class ClassScheduleUpdate(ClassScheduleBase):
    pass


class ClassScheduleResponse(ClassScheduleBase):
    id: int
    class_uuid: str
    is_current: bool
    effective_date: datetime
    created_date: datetime
    gym: Optional[GymLocationResponse] = None
    class_type: Optional[ClassTypeResponse] = None

    class Config:
        from_attributes = True


class TermBase(BaseModel):
    term_name: str
    start_date: date
    end_date: date


class TermCreate(TermBase):
    pass


class TermResponse(TermBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TermTargetBase(BaseModel):
    term_id: int
    rank: str
    target: float


class TermTargetCreate(TermTargetBase):
    pass


class TermTargetResponse(TermTargetBase):
    id: int

    class Config:
        from_attributes = True


class CurriculumBase(BaseModel):
    class_id: int
    name: Optional[str] = None
    description: Optional[str] = None


class CurriculumCreate(CurriculumBase):
    pass


class CurriculumResponse(CurriculumBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LessonBase(BaseModel):
    curriculum_id: int
    title: str
    description: Optional[str] = None
    lesson_plan_url: Optional[str] = None
    video_folder_url: Optional[str] = None


class LessonCreate(LessonBase):
    pass


class LessonUpdate(LessonBase):
    pass


class LessonResponse(LessonBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClassInstanceBase(BaseModel):
    class_id: int
    class_date: date
    teacher_uuid: Optional[str] = None
    lesson_id: Optional[int] = None


class ClassInstanceCreate(ClassInstanceBase):
    pass


class ClassInstanceUpdate(ClassInstanceBase):
    pass


class ClassInstanceResponse(ClassInstanceBase):
    id: int
    class_schedule: Optional["ClassScheduleResponse"] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AttendanceBase(BaseModel):
    user_uuid: str
    class_id: int
    class_instance_id: Optional[int] = None
    teacher_uuid: Optional[str] = None


class CheckInRequest(BaseModel):
    user_uuid: str
    class_id: int
    class_instance_id: Optional[int] = None


class BulkCheckInRequest(BaseModel):
    user_uuid: str
    class_ids: List[int]


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    confirmed_by: Optional[str] = None


class AttendanceResponse(AttendanceBase):
    id: int
    user_role_id: Optional[int] = None
    attendance_date: date
    created_at: datetime
    status: str
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    user: Optional[UserResponse] = None
    class_schedule: Optional[ClassScheduleResponse] = None

    class Config:
        from_attributes = True


class FeedbackBase(BaseModel):
    attendance_id: int
    rating: str
    comment: Optional[str] = None


class FeedbackCreate(FeedbackBase):
    pass


class FeedbackResponse(FeedbackBase):
    id: int
    user_uuid: str
    class_instance_id: int
    created_at: datetime
    updated_at: datetime
    user: Optional["UserResponse"] = None
    class_instance: Optional["ClassInstanceResponse"] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    roles: List[RoleResponse] = []
    csrf_token: Optional[str] = None


class UserInfoResponse(BaseModel):
    user: UserResponse
    roles: List[RoleResponse] = []
    csrf_token: Optional[str] = None


class DashboardStats(BaseModel):
    totalClasses: int
    totalPoints: float
    classesThisMonth: int
    lastClassDaysAgo: Optional[int] = None


class AttendanceTrendItem(BaseModel):
    date: str
    count: int
    points: float


class FeedbackStats(BaseModel):
    totalFeedback: int
    positiveCount: int
    negativeCount: int
    positivePercent: float


class CommentBase(BaseModel):
    content: str
    rating: Optional[str] = None


class CommentCreate(CommentBase):
    parent_comment_id: Optional[int] = None
    target_user_uuid: Optional[str] = None


class CommentUpdate(BaseModel):
    content: str


class CommentResponse(CommentBase):
    id: int
    comment_uuid: str
    author: Optional[UserResponse] = None
    target_user: Optional[UserResponse] = None
    parent_comment_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    replies: List["CommentResponse"] = []
    reply_count: int = 0

    class Config:
        from_attributes = True


CommentResponse.model_rebuild()


class ThemeBase(BaseModel):
    name: str
    config: str
    is_active: bool = False


class ThemeCreate(ThemeBase):
    pass


class ThemeUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[str] = None
    is_active: Optional[bool] = None


class ThemeResponse(ThemeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NewsBase(BaseModel):
    title: str
    content: str
    is_published: bool = False


class NewsCreate(NewsBase):
    pass


class NewsUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_published: Optional[bool] = None


class NewsResponse(NewsBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DbStatsResponse(BaseModel):
    total_users: int
    total_classes: int
    total_attendance: int
    size: str
    kiosk_pin_set: bool


class KioskUserPinVerifyRequest(BaseModel):
    pin: str


class KioskUserPinVerifyResponse(BaseModel):
    valid: bool
    user: Optional[UserResponse] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    csrf_token: Optional[str] = None
