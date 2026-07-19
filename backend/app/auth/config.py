import os
import secrets

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
MAX_SESSION_HOURS = int(os.getenv("MAX_SESSION_HOURS", "24"))
KIOSK_IDLE_MINUTES = int(os.getenv("KIOSK_IDLE_MINUTES", "240"))

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "True").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")
COOKIE_HTTPONLY = True
COOKIE_PATH = "/"

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    if os.getenv("ENVIRONMENT", "development") == "production":
        raise ValueError("JWT_SECRET_KEY must be set in production!")
    JWT_SECRET_KEY = secrets.token_urlsafe(64)

JWT_ALGORITHM = "HS256"

CSRF_TOKEN_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
