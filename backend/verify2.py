import sys

sys.path.insert(0, ".")
from app.database import SessionLocal
from app import models

# Use bcrypt directly from venv
import bcrypt

db = SessionLocal()
try:
    user = (
        db.query(models.User).filter(models.User.email == "tablet@example.com").first()
    )
    if user:
        print(f"Hash in DB: {user.password_hash}")

        # Try to verify - but use the same bcrypt module the server uses
        result = bcrypt.checkpw(b"tablet123", user.password_hash.encode("utf-8"))
        print(f"bcrypt.checkpw result: {result}")
finally:
    db.close()
