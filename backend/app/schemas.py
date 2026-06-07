from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import Optional, List


class UserBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr = Field(max_length=255)
    rank: Optional[str] = Field(default="White", max_length=50)
    nicknames: Optional[str] = Field(default=None, max_length=200)
    comments: Optional[str] = Field(default=None, max_length=2000)
    last_graded_date: Optional[date] = None


class UserCreate(UserBase):
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    pin: Optional[str] = Field(default=None, min_length=4, max_length=8)
    profile_image_url: Optional[str] = Field(default=None, max_length=500)


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[EmailStr] = Field(default=None, max_length=255)
    rank: Optional[str] = Field(default=None, max_length=50)
    nicknames: Optional[str] = Field(default=None, max_length=200)
    comments: Optional[str] = Field(default=None, max_length=2000)
    last_graded_date: Optional[date] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    pin: Optional[str] = Field(default=None, min_length=4, max_length=8)


class UserResponse(UserBase):
    user_uuid: str
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
    name: str = Field(max_length=50)
    description: Optional[str] = Field(default=None, max_length=500)

    class Config:
        from_attributes = True


class UserRoleResponse(BaseModel):
    id: int
    user_uuid: str = Field(min_length=1, max_length=64)
    role_id: int
    is_current: bool
    effective_date: datetime
    role: Optional[RoleResponse] = None

    class Config:
        from_attributes = True


class GymLocationBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    address: Optional[str] = Field(default=None, max_length=500)


class GymLocationCreate(GymLocationBase):
    pass


class GymLocationResponse(GymLocationBase):
    id: int

    class Config:
        from_attributes = True


class ClassTypeBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class ClassTypeCreate(ClassTypeBase):
    pass


class ClassTypeResponse(ClassTypeBase):
    id: int

    class Config:
        from_attributes = True


class ClassScheduleBase(BaseModel):
    class_name: str = Field(min_length=1, max_length=200)
    day: Optional[str] = Field(default=None, max_length=20)
    time: Optional[str] = Field(default=None, max_length=20)
    description: Optional[str] = Field(default=None, max_length=2000)
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
    term_name: str = Field(min_length=1, max_length=200)
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
    rank: str = Field(min_length=1, max_length=50)
    target: float


class TermTargetCreate(TermTargetBase):
    pass


class TermTargetResponse(TermTargetBase):
    id: int

    class Config:
        from_attributes = True


class CurriculumBase(BaseModel):
    class_id: int
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)


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
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    lesson_plan_url: Optional[str] = Field(default=None, max_length=500)
    video_folder_url: Optional[str] = Field(default=None, max_length=500)


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
    teacher_uuid: Optional[str] = Field(default=None, min_length=1, max_length=64)
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
    user_uuid: str = Field(min_length=1, max_length=64)
    class_id: int
    class_instance_id: Optional[int] = None
    teacher_uuid: Optional[str] = Field(default=None, min_length=1, max_length=64)


class CheckInRequest(BaseModel):
    user_uuid: str = Field(min_length=1, max_length=64)
    class_id: int
    class_instance_id: Optional[int] = None


class BulkCheckInRequest(BaseModel):
    user_uuid: str = Field(min_length=1, max_length=64)
    class_ids: List[int] = Field(min_length=1)


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
    rating: str = Field(max_length=50)
    comment: Optional[str] = Field(default=None, max_length=2000)


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
    email: str = Field(max_length=255)
    password: str = Field(min_length=1, max_length=128)


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
    content: str = Field(min_length=1, max_length=5000)
    rating: Optional[str] = Field(default=None, max_length=50)


class CommentCreate(CommentBase):
    parent_comment_id: Optional[int] = None
    target_user_uuid: Optional[str] = None


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


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
    name: str = Field(min_length=1, max_length=100)
    config: str = Field(max_length=10000)
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
    title: str = Field(min_length=1, max_length=500)
    content: str = Field(min_length=1, max_length=10000)
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
    pin: str = Field(min_length=4, max_length=8)


class KioskUserPinVerifyForUserRequest(BaseModel):
    user_uuid: str = Field(min_length=1, max_length=64)
    pin: str = Field(min_length=4, max_length=8)


class KioskUserResponse(UserBase):
    user_uuid: str
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


class KioskUserPinVerifyResponse(BaseModel):
    valid: bool
    user: Optional[KioskUserResponse] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    csrf_token: Optional[str] = None


class KioskUnlockResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: KioskUserResponse
    roles: List[RoleResponse]
