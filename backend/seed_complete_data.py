from app.database import SessionLocal, engine
from app.models import (
    User,
    Role,
    UserRole,
    GymLocation,
    ClassType,
    ClassSchedule,
    Term,
    TermTarget,
    Curriculum,
    Lesson,
    ClassInstance,
    Attendance,
    ClassFeedback,
    Comment,
    KioskAuth,
    WebsiteTheme,
    News,
)
from passlib.context import CryptContext
from datetime import date, datetime, timedelta
import random
import uuid
import json

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_tables():
    from app.database import Base

    Base.metadata.create_all(bind=engine)


def seed_data():
    db = SessionLocal()

    print("Creating tables...")
    create_tables()

    try:
        print("Seeding roles...")
        roles_data = [
            {"name": "Student", "description": "Regular student member"},
            {"name": "Teacher", "description": "Instructor who teaches classes"},
            {"name": "Admin", "description": "Administrator with full access"},
            {"name": "Tablet", "description": "Tablet-only user for check-in kiosk"},
            {"name": "Kiosk", "description": "Self-service kiosk check-in account"},
        ]
        for role_data in roles_data:
            existing = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not existing:
                db.add(Role(**role_data))
        db.commit()

        student_role = db.query(Role).filter(Role.name == "Student").first()
        teacher_role = db.query(Role).filter(Role.name == "Teacher").first()
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        tablet_role = db.query(Role).filter(Role.name == "Tablet").first()
        kiosk_role = db.query(Role).filter(Role.name == "Kiosk").first()

        print("Seeding gym locations...")
        gyms_data = [
            {"name": "Downtown", "address": "123 Main Street, Downtown"},
            {"name": "Westside", "address": "456 West Avenue, Westside"},
        ]
        for gym_data in gyms_data:
            existing = (
                db.query(GymLocation)
                .filter(GymLocation.name == gym_data["name"])
                .first()
            )
            if not existing:
                db.add(GymLocation(**gym_data))
        db.commit()

        downtown_gym = (
            db.query(GymLocation).filter(GymLocation.name == "Downtown").first()
        )
        westside_gym = (
            db.query(GymLocation).filter(GymLocation.name == "Westside").first()
        )

        print("Seeding class types...")
        class_types_data = [
            {"name": "Gi"},
            {"name": "No-Gi"},
            {"name": "MMA"},
            {"name": "Open Mat"},
            {"name": "Kids"},
        ]
        for type_data in class_types_data:
            existing = (
                db.query(ClassType).filter(ClassType.name == type_data["name"]).first()
            )
            if not existing:
                db.add(ClassType(**type_data))
        db.commit()

        gi_type = db.query(ClassType).filter(ClassType.name == "Gi").first()
        nogi_type = db.query(ClassType).filter(ClassType.name == "No-Gi").first()
        openmat_type = db.query(ClassType).filter(ClassType.name == "Open Mat").first()
        kids_type = db.query(ClassType).filter(ClassType.name == "Kids").first()

        print("Seeding class schedules...")
        classes_data = [
            {
                "class_name": "Fundamentals Gi",
                "day": "Monday",
                "time": "18:00",
                "points": 1.0,
                "gym_id": downtown_gym.id,
                "class_type_id": gi_type.id,
            },
            {
                "class_name": "Advanced Gi",
                "day": "Monday",
                "time": "19:30",
                "points": 1.5,
                "gym_id": downtown_gym.id,
                "class_type_id": gi_type.id,
            },
            {
                "class_name": "No-Gi Fundamentals",
                "day": "Tuesday",
                "time": "18:00",
                "points": 1.0,
                "gym_id": downtown_gym.id,
                "class_type_id": nogi_type.id,
            },
            {
                "class_name": "No-Gi Advanced",
                "day": "Tuesday",
                "time": "19:30",
                "points": 1.5,
                "gym_id": downtown_gym.id,
                "class_type_id": nogi_type.id,
            },
            {
                "class_name": "MMA",
                "day": "Wednesday",
                "time": "19:00",
                "points": 1.5,
                "gym_id": westside_gym.id,
                "class_type_id": nogi_type.id,
            },
            {
                "class_name": "Kids Gi",
                "day": "Wednesday",
                "time": "17:00",
                "points": 1.0,
                "gym_id": downtown_gym.id,
                "class_type_id": kids_type.id,
            },
            {
                "class_name": "Open Mat",
                "day": "Saturday",
                "time": "10:00",
                "points": 1.0,
                "gym_id": downtown_gym.id,
                "class_type_id": openmat_type.id,
            },
            {
                "class_name": "Sunday Open Mat",
                "day": "Sunday",
                "time": "11:00",
                "points": 1.0,
                "gym_id": westside_gym.id,
                "class_type_id": openmat_type.id,
            },
        ]
        for cls_data in classes_data:
            existing = (
                db.query(ClassSchedule)
                .filter(
                    ClassSchedule.class_name == cls_data["class_name"],
                    ClassSchedule.is_current == True,
                )
                .first()
            )
            if not existing:
                db.add(
                    ClassSchedule(
                        class_uuid=str(uuid.uuid4()), **cls_data, is_current=True
                    )
                )
        db.commit()

        all_classes = db.query(ClassSchedule).all()
        fundamentals_class = (
            db.query(ClassSchedule)
            .filter(ClassSchedule.class_name == "Fundamentals Gi")
            .first()
        )
        advanced_class = (
            db.query(ClassSchedule)
            .filter(ClassSchedule.class_name == "Advanced Gi")
            .first()
        )

        print("Seeding terms and targets...")
        terms_data = [
            {
                "term_name": "Spring 2026",
                "start_date": date(2026, 3, 1),
                "end_date": date(2026, 5, 31),
            },
            {
                "term_name": "Summer 2026",
                "start_date": date(2026, 6, 1),
                "end_date": date(2026, 8, 31),
            },
        ]
        for term_data in terms_data:
            existing = (
                db.query(Term).filter(Term.term_name == term_data["term_name"]).first()
            )
            if not existing:
                db.add(Term(**term_data))
        db.commit()

        spring_term = db.query(Term).filter(Term.term_name == "Spring 2026").first()

        targets_data = [
            {"term_id": spring_term.id, "rank": "White", "target": 20.0},
            {"term_id": spring_term.id, "rank": "Blue", "target": 25.0},
            {"term_id": spring_term.id, "rank": "Purple", "target": 30.0},
            {"term_id": spring_term.id, "rank": "Brown", "target": 35.0},
            {"term_id": spring_term.id, "rank": "Black", "target": 40.0},
        ]
        for target_data in targets_data:
            existing = (
                db.query(TermTarget)
                .filter(
                    TermTarget.term_id == target_data["term_id"],
                    TermTarget.rank == target_data["rank"],
                )
                .first()
            )
            if not existing:
                db.add(TermTarget(**target_data))
        db.commit()

        print("Seeding users...")
        placeholder_url = "/placeholder-avatar.svg"
        demo_users = [
            {
                "first_name": "John",
                "last_name": "Smith",
                "email": "john@example.com",
                "rank": "Blue",
                "password": "password123",
                "pin": "1001",
                "nicknames": "J-Smitty",
                "profile_image_url": placeholder_url,
                "roles": [student_role],
            },
            {
                "first_name": "Jane",
                "last_name": "Doe",
                "email": "jane@example.com",
                "rank": "Purple",
                "password": "password123",
                "pin": "1002",
                "nicknames": "JD",
                "profile_image_url": placeholder_url,
                "roles": [student_role],
            },
            {
                "first_name": "Mike",
                "last_name": "Johnson",
                "email": "mike@example.com",
                "rank": "Black",
                "password": "password123",
                "pin": "1003",
                "profile_image_url": placeholder_url,
                "roles": [teacher_role],
            },
            {
                "first_name": "Sarah",
                "last_name": "Williams",
                "email": "sarah@example.com",
                "rank": "Brown",
                "password": "password123",
                "pin": "1004",
                "profile_image_url": placeholder_url,
                "roles": [teacher_role],
            },
            {
                "first_name": "Admin",
                "last_name": "User",
                "email": "admin@example.com",
                "rank": "Black",
                "password": "admin123",
                "pin": "1005",
                "profile_image_url": placeholder_url,
                "roles": [admin_role, teacher_role],
            },
            {
                "first_name": "Tablet",
                "last_name": "Kiosk",
                "email": "tablet@example.com",
                "rank": "White",
                "password": "tablet123",
                "pin": "1006",
                "profile_image_url": placeholder_url,
                "roles": [tablet_role],
            },
            {
                "first_name": "Kiosk",
                "last_name": "Service",
                "email": "kiosk@ckbtracker.com",
                "rank": "White",
                "password": "kiosk123",
                "pin": "1007",
                "profile_image_url": placeholder_url,
                "roles": [kiosk_role],
            },
            {
                "first_name": "David",
                "last_name": "Brown",
                "email": "david@example.com",
                "rank": "White",
                "password": "password123",
                "pin": "1012",
                "profile_image_url": placeholder_url,
                "roles": [student_role],
            },
            {
                "first_name": "Emily",
                "last_name": "Davis",
                "email": "emily@example.com",
                "rank": "Blue",
                "password": "password123",
                "pin": "1008",
                "profile_image_url": placeholder_url,
                "roles": [student_role],
            },
            {
                "first_name": "Chris",
                "last_name": "Wilson",
                "email": "chris@example.com",
                "rank": "Purple",
                "password": "password123",
                "pin": "1009",
                "profile_image_url": placeholder_url,
                "roles": [student_role],
            },
            {
                "first_name": "Lisa",
                "last_name": "Martinez",
                "email": "lisa@example.com",
                "rank": "Blue",
                "password": "password123",
                "pin": "1010",
                "profile_image_url": placeholder_url,
                "roles": [student_role],
            },
            {
                "first_name": "Tom",
                "last_name": "Anderson",
                "email": "tom@example.com",
                "rank": "White",
                "password": "password123",
                "pin": "1011",
                "profile_image_url": placeholder_url,
                "roles": [student_role],
            },
            {
                "first_name": "No-PIN",
                "last_name": "Student",
                "email": "nopin@example.com",
                "rank": "Blue",
                "password": "password123",
                "pin": None,
                "profile_image_url": placeholder_url,
                "roles": [student_role],
            },
            {
                "first_name": "Inactive",
                "last_name": "Student",
                "email": "inactive@example.com",
                "rank": "White",
                "password": "password123",
                "pin": "1099",
                "is_current": False,
                "profile_image_url": placeholder_url,
                "roles": [student_role],
            },
        ]

        user_uuid_map = {}
        for user_data in demo_users:
            roles = user_data.pop("roles")
            is_current = user_data.pop("is_current", True)
            existing = (
                db.query(User)
                .filter(User.email == user_data["email"], User.is_current == True)
                .first()
            )
            if not existing:
                user_uuid = str(uuid.uuid4())
                pin_val = user_data.pop("pin", None)
                user = User(
                    user_uuid=user_uuid,
                    password_hash=pwd_context.hash(user_data.pop("password")),
                    pin_hash=pwd_context.hash(pin_val) if pin_val else None,
                    is_current=is_current,
                    **user_data,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                user_uuid_map[user.email] = user_uuid

                for role in roles:
                    user_role = UserRole(
                        user_uuid=user_uuid, role_id=role.id, is_current=True
                    )
                    db.add(user_role)
                db.commit()

        db.flush()

        def _resolve_uuid(email):
            if email in user_uuid_map:
                return user_uuid_map[email]
            user = db.query(User).filter(User.email == email).first()
            return user.user_uuid if user else None

        john_uuid = _resolve_uuid("john@example.com")
        jane_uuid = _resolve_uuid("jane@example.com")
        mike_uuid = _resolve_uuid("mike@example.com")
        sarah_uuid = _resolve_uuid("sarah@example.com")
        admin_uuid = _resolve_uuid("admin@example.com")
        david_uuid = _resolve_uuid("david@example.com")
        emily_uuid = _resolve_uuid("emily@example.com")
        chris_uuid = _resolve_uuid("chris@example.com")
        lisa_uuid = _resolve_uuid("lisa@example.com")
        tom_uuid = _resolve_uuid("tom@example.com")

        print("Seeding curricula and lessons...")
        for cls in [fundamentals_class, advanced_class]:
            if not cls:
                continue
            existing = (
                db.query(Curriculum).filter(Curriculum.class_id == cls.id).first()
            )
            if not existing:
                curriculum = Curriculum(
                    class_id=cls.id,
                    name=f"{cls.class_name} Curriculum",
                    description=f"Training curriculum for {cls.class_name}",
                )
                db.add(curriculum)
                db.commit()
                db.refresh(curriculum)

                lessons_data = [
                    {
                        "title": "Basic Positions",
                        "description": "Learn the fundamental positions in BJJ",
                    },
                    {
                        "title": "Closed Guard",
                        "description": "Master the closed guard position",
                    },
                    {
                        "title": "Open Guard",
                        "description": "Open guard techniques and sweeps",
                    },
                    {
                        "title": "Side Control",
                        "description": "Escapes and submissions from side control",
                    },
                    {"title": "Mount", "description": "Mount position and submissions"},
                    {
                        "title": "Back Control",
                        "description": "Taking and maintaining the back",
                    },
                ]
                for lesson_data in lessons_data:
                    lesson = Lesson(curriculum_id=curriculum.id, **lesson_data)
                    db.add(lesson)
                db.commit()

        print("Seeding class instances and attendance...")
        today = date.today()
        attendance_records = []

        for days_ago in range(60, 0, -1):
            class_date = today - timedelta(days=days_ago)
            day_name = class_date.strftime("%A")

            day_classes = [c for c in all_classes if c.day == day_name]

            for cls in day_classes:
                if random.random() < 0.7:
                    teacher = mike_uuid if random.random() < 0.6 else sarah_uuid
                    instance = ClassInstance(
                        class_id=cls.id,
                        class_date=class_date,
                        teacher_uuid=teacher,
                    )
                    db.add(instance)
                    db.commit()
                    db.refresh(instance)

                    students = [s for s in [john_uuid, jane_uuid, david_uuid] if s]
                    if random.random() < 0.5:
                        students.append(emily_uuid)
                    if random.random() < 0.3:
                        students.append(chris_uuid)
                    if random.random() < 0.2:
                        students.append(lisa_uuid)
                    if random.random() < 0.1:
                        students.append(tom_uuid)
                    students = [s for s in students if s]

                    for student_uuid in students:
                        if not student_uuid:
                            continue
                        existing_att = (
                            db.query(Attendance)
                            .filter(
                                Attendance.user_uuid == student_uuid,
                                Attendance.class_id == cls.id,
                                Attendance.attendance_date == class_date,
                            )
                            .first()
                        )

                        if not existing_att:
                            status = "confirmed" if random.random() < 0.8 else "pending"
                            att = Attendance(
                                user_uuid=student_uuid,
                                class_id=cls.id,
                                class_instance_id=instance.id,
                                teacher_uuid=teacher,
                                attendance_date=class_date,
                                status=status,
                            )
                            db.add(att)
                            db.flush()
                            attendance_records.append(att)

        db.commit()

        print("Seeding feedback on attendance...")
        feedback_comments = {
            "thumbs_up": [
                "Great class! Learned a lot of new techniques.",
                "The instructor was very helpful and patient.",
                "Good energy in the class today.",
                "Perfect drill-to-sparring ratio.",
                "Love the attention to detail.",
            ],
            "thumbs_down": [
                "Class was a bit crowded.",
                "Would prefer more technique explanation.",
                "Too many people, not enough mat space.",
                "Could use more drilling time.",
            ],
        }

        sample_attendances = attendance_records[:30]
        for att in sample_attendances:
            if random.random() < 0.6:
                rating = random.choice(["thumbs_up", "thumbs_down"])
                comment = random.choice(feedback_comments.get(rating, []))

                existing_fb = (
                    db.query(ClassFeedback)
                    .filter(ClassFeedback.attendance_id == att.id)
                    .first()
                )

                if not existing_fb:
                    feedback = ClassFeedback(
                        user_uuid=att.user_uuid,
                        attendance_id=att.id,
                        class_instance_id=att.class_instance_id,
                        rating=rating,
                        comment=comment,
                    )
                    db.add(feedback)

        db.commit()

        print("Seeding comments...")
        existing_comment = db.query(Comment).first()
        if not existing_comment and mike_uuid and john_uuid and sarah_uuid:
            comment1 = Comment(
                comment_uuid=str(uuid.uuid4()),
                author_uuid=mike_uuid,
                target_user_uuid=john_uuid,
                content="Great improvement in your guard passing, John. Keep it up!",
                rating="positive",
            )
            db.add(comment1)
            db.commit()
            db.refresh(comment1)

            comment2 = Comment(
                comment_uuid=str(uuid.uuid4()),
                parent_comment_id=comment1.id,
                author_uuid=sarah_uuid,
                target_user_uuid=john_uuid,
                content="Agreed! Your hip escape is looking much smoother too.",
                rating="positive",
            )
            db.add(comment2)
            db.commit()

            if jane_uuid:
                comment3 = Comment(
                    comment_uuid=str(uuid.uuid4()),
                    author_uuid=mike_uuid,
                    target_user_uuid=jane_uuid,
                    content="Jane, excellent work on your sweeps tonight. Very sharp.",
                    rating="positive",
                )
                db.add(comment3)
                db.commit()

        print("Seeding kiosk auth...")
        existing_kiosk = db.query(KioskAuth).first()
        if not existing_kiosk:
            kiosk = KioskAuth(pin_hash=pwd_context.hash("1234"))
            db.add(kiosk)
            db.commit()

        print("Seeding website theme...")
        existing_theme = db.query(WebsiteTheme).first()
        if not existing_theme:
            theme = WebsiteTheme(
                name="CKB Dark",
                is_active=True,
                config=json.dumps(
                    {
                        "--background": "#131313",
                        "--foreground": "#e5e2e1",
                        "--card": "#2a2a2a",
                        "--card-foreground": "#e5e2e1",
                        "--primary": "#dc2626",
                        "--primary-foreground": "#fff6f5",
                        "--secondary": "#201f1f",
                        "--secondary-foreground": "#e6bdb8",
                        "--muted": "#1c1b1b",
                        "--muted-foreground": "#e6bdb8",
                        "--accent": "#1c1b1b",
                        "--accent-foreground": "#e5e2e1",
                        "--destructive": "#93000a",
                        "--destructive-foreground": "#ffdad6",
                        "--border": "#5c403c",
                        "--input": "#5c403c",
                        "--ring": "#dc2626",
                        "--radius": "0.5rem",
                        "--headline-font": "'Space Grotesk', sans-serif",
                        "--body-font": "'Inter', system-ui, sans-serif",
                        "logo_url": "",
                        "dark": {
                            "--background": "#131313",
                            "--foreground": "#e5e2e1",
                            "--card": "#2a2a2a",
                            "--border": "#5c403c",
                        },
                    }
                ),
            )
            db.add(theme)
            db.commit()

        print("Seeding news...")
        existing_news = db.query(News).first()
        if not existing_news:
            news_data = [
                News(
                    title="Welcome to CKB Tracker",
                    content="We're excited to launch our new attendance tracking system. Check in to classes, track your progress, and earn points toward your belt promotion!",
                    is_published=True,
                ),
                News(
                    title="Summer Schedule Now Active",
                    content="Our summer class schedule is in effect. We've added an extra evening session on Thursdays. Check the schedule page for all class times.",
                    is_published=True,
                ),
                News(
                    title="Upcoming In-House Tournament",
                    content="Annual in-house tournament scheduled for July 15th. All belts and experience levels welcome. Sign up at the front desk.",
                    is_published=False,
                ),
            ]
            for news_item in news_data:
                db.add(news_item)
            db.commit()

        print("\n" + "=" * 50)
        print("SEED DATA COMPLETE!")
        print("=" * 50)
        print("\nDemo accounts:")
        print("  Kiosk (unlock): kiosk@ckbtracker.com / kiosk123")
        print("  Admin: admin@example.com / admin123")
        print("  Teacher: mike@example.com / password123")
        print("  Teacher: sarah@example.com / password123")
        print("  Tablet: tablet@example.com / tablet123")
        print("  Student: john@example.com / password123 (PIN: 1001)")
        print("  Student: jane@example.com / password123 (PIN: 1002)")
        print("  Student: david@example.com / password123 (PIN: 1012)")
        print("  No-PIN: nopin@example.com / password123 (no PIN)")
        print("  Inactive: inactive@example.com (is_current=False)")
        print()
        print("Database stats:")
        print(f"  Roles: {db.query(Role).count()}")
        print(f"  Users: {db.query(User).count()}")
        print(f"  UserRoles: {db.query(UserRole).count()}")
        print(f"  Gyms: {db.query(GymLocation).count()}")
        print(f"  Class Types: {db.query(ClassType).count()}")
        print(f"  Classes: {db.query(ClassSchedule).count()}")
        print(f"  Terms: {db.query(Term).count()}")
        print(f"  Term Targets: {db.query(TermTarget).count()}")
        print(f"  Curricula: {db.query(Curriculum).count()}")
        print(f"  Lessons: {db.query(Lesson).count()}")
        print(f"  Class Instances: {db.query(ClassInstance).count()}")
        print(f"  Attendance: {db.query(Attendance).count()}")
        print(f"  Feedback: {db.query(ClassFeedback).count()}")
        print(f"  Comments: {db.query(Comment).count()}")
        print(f"  News: {db.query(News).count()}")
        print(f"  Themes: {db.query(WebsiteTheme).count()}")
        print(f"  KioskAuth: {db.query(KioskAuth).count()}")

    except Exception as e:
        print(f"Error seeding data: {e}")
        import traceback

        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
