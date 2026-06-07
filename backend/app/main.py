from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.auth.limiter import limiter
from slowapi.errors import RateLimitExceeded
import os

from app.database import engine, SessionLocal
from app import models
from app.routers import (
    themes,
    users,
    classes,
    class_instances,
    attendance,
    terms,
    gyms,
    class_types,
    roles,
    curricula,
    lessons,
    auth,
    feedback,
    kiosk,
    database,
    dashboard,
    news,
    comments,
)


@asynccontextmanager
async def lifespan(application: FastAPI):
    db = SessionLocal()
    try:
        existing_tablet_role = (
            db.query(models.Role).filter(models.Role.name == "Tablet").first()
        )
        if not existing_tablet_role:
            tablet_role = models.Role(
                name="Tablet", description="Tablet-only user for check-in kiosk"
            )
            db.add(tablet_role)
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="CKB Tracker API", version="1.0.0", lifespan=lifespan)

# Rate limiter setup
app.state.limiter = limiter


async def rate_limit_handler(request, exc):
    from starlette.responses import JSONResponse

    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )


app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Security middleware - Trusted Host
allowed_hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# CORS middleware - configurable via environment
cors_origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://localhost:3001"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if os.getenv("ENVIRONMENT") == "production":
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
    return response


# Request logging middleware for security audit
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time

    start_time = time.time()

    response = await call_next(request)

    process_time = (time.time() - start_time) * 1000
    client_host = request.client.host if request.client else "unknown"

    log_msg = f"{client_host} - {request.method} {request.url.path} - {response.status_code} - {process_time:.2f}ms"

    if response.status_code >= 400:
        import logging

        logging.warning(log_msg)
    else:
        import logging

        logging.info(log_msg)

    return response


# Create tables
models.Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(classes.router, prefix="/classes", tags=["Classes"])
app.include_router(
    class_instances.router, prefix="/class-instances", tags=["Class Instances"]
)
app.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
app.include_router(terms.router, prefix="/terms", tags=["Terms"])
app.include_router(gyms.router, prefix="/gym-locations", tags=["Gym Locations"])
app.include_router(class_types.router, prefix="/class-types", tags=["Class Types"])
app.include_router(roles.router, prefix="/roles", tags=["Roles"])
app.include_router(curricula.router, prefix="/curricula", tags=["Curricula"])
app.include_router(lessons.router, prefix="/lessons", tags=["Lessons"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
app.include_router(kiosk.router, prefix="/kiosk", tags=["Kiosk"])
app.include_router(database.router, prefix="/database", tags=["Database"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(news.router, tags=["News"])
app.include_router(comments.router, prefix="/comments", tags=["Comments"])
app.include_router(themes.router, prefix="/themes", tags=["Themes"])

# Serve uploaded photos statically
import os

uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/")
def read_root():
    return {"message": "CKB Tracker API is live!"}
