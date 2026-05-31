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
    KioskAuth,
)
import bcrypt
from datetime import date, datetime, timedelta
import random
import uuid


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


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

        print("Seeding gym locations...")
        gyms_data = [
            {"name": "Downtown", "address": "123 Main Street, Downtown"},
            {"name": "Westside", "address": "456 West Avenue, Westside"},
            {"name": "Northside", "address": "789 North Blvd, Northside"},
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
                "first_name": "David",
                "last_name": "Brown",
                "email": "david@example.com",
                "rank": "White",
                "password": "password123",
                "pin": "1007",
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
        ]

        user_uuid_map = {}
        for user_data in demo_users:
            roles = user_data.pop("roles")
            existing = (
                db.query(User)
                .filter(User.email == user_data["email"], User.is_current == True)
                .first()
            )
            if not existing:
                user_uuid = str(uuid.uuid4())
                user = User(
                    user_uuid=user_uuid,
                    password_hash=hash_password(user_data.pop("password")),
                    pin_hash=hash_password(user_data.pop("pin"))
                    if "pin" in user_data
                    else None,
                    **user_data,
                    is_current=True,
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

        john_uuid = (
            user_uuid_map.get("john@example.com")
            or db.query(User).filter(User.email == "john@example.com").first().user_uuid
        )
        jane_uuid = (
            user_uuid_map.get("jane@example.com")
            or db.query(User).filter(User.email == "jane@example.com").first().user_uuid
        )
        mike_uuid = (
            user_uuid_map.get("mike@example.com")
            or db.query(User).filter(User.email == "mike@example.com").first().user_uuid
        )
        sarah_uuid = (
            user_uuid_map.get("sarah@example.com")
            or db.query(User)
            .filter(User.email == "sarah@example.com")
            .first()
            .user_uuid
        )
        admin_uuid = (
            user_uuid_map.get("admin@example.com")
            or db.query(User)
            .filter(User.email == "admin@example.com")
            .first()
            .user_uuid
        )

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
                    instance = ClassInstance(
                        class_id=cls.id,
                        class_date=class_date,
                        teacher_uuid=mike_uuid if random.random() < 0.6 else sarah_uuid,
                    )
                    db.add(instance)
                    db.commit()
                    db.refresh(instance)

                    students = [john_uuid, jane_uuid]
                    if random.random() < 0.5:
                        students.append(user_uuid_map.get("emily@example.com") or "")
                    if random.random() < 0.3:
                        students.append(user_uuid_map.get("chris@example.com") or "")

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
                            att = Attendance(
                                user_uuid=student_uuid,
                                class_id=cls.id,
                                class_instance_id=instance.id,
                                teacher_uuid=instance.teacher_uuid,
                                attendance_date=class_date,
                                status="confirmed"
                                if random.random() < 0.8
                                else "pending",
                            )
                            db.add(att)
                            db.flush()
                            attendance_records.append(att)

        db.commit()

        print("Seeding feedback...")
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

        sample_attendances = attendance_records[:20]
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

        print("Seeding kiosk auth...")
        existing_kiosk = db.query(KioskAuth).first()
        if not existing_kiosk:
            kiosk = KioskAuth(pin_hash=hash_password("1234"))
            db.add(kiosk)
            db.commit()

        print("\n" + "=" * 50)
        print("SEED DATA COMPLETE!")
        print("=" * 50)
        print("\nDemo accounts:")
        print("  Student: john@example.com / password123")
        print("  Student: jane@example.com / password123")
        print("  Teacher: mike@example.com / password123")
        print("  Teacher: sarah@example.com / password123")
        print("  Admin: admin@example.com / admin123")
        print("  Tablet: tablet@example.com / tablet123")
        print("\nKiosk PIN: 1234")
        print("\nDatabase stats:")
        print(f"  Users: {db.query(User).count()}")
        print(f"  Classes: {db.query(ClassSchedule).count()}")
        print(f"  Attendance records: {db.query(Attendance).count()}")
        print(f"  Feedback: {db.query(ClassFeedback).count()}")

    except Exception as e:
        print(f"Error seeding data: {e}")
        import traceback

        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
