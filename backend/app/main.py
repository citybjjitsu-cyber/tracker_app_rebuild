from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.auth.limiter import limiter
from app.auth.csrf import csrf_middleware_dispatch
from slowapi.errors import RateLimitExceeded
import os
import logging

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
    audit,
)


@asynccontextmanager
async def lifespan(application: FastAPI):
    db = SessionLocal()
    try:
        existing_tablet_role = (
            db.query(models.Role).filter(models.Role.name == "Tablet").first()
        )
        if existing_tablet_role is None:
            user_count = db.query(models.User).count()
            if user_count == 0:
                db.close()
                logging.info("Database is empty. Auto-seeding with demo data...")
                from seed_complete_data import seed_data

                seed_data()
            else:
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
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )


app.add_exception_handler(RateLimitExceeded, rate_limit_handler)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logging.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# CSRF validation middleware (must be before CORS for proper cookie access)
@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    return await csrf_middleware_dispatch(request, call_next)


# Request body size limit middleware
MAX_JSON_BODY = 1_048_576  # 1 MB
MAX_MULTIPART_BODY = 10_485_760  # 10 MB


@app.middleware("http")
async def limit_request_body(request: Request, call_next):
    if request.method in ("POST", "PUT", "PATCH"):
        content_length = request.headers.get("content-length")
        if content_length:
            size = int(content_length)
            content_type = request.headers.get("content-type", "")
            if "multipart/form-data" in content_type:
                if size > MAX_MULTIPART_BODY:
                    return Response(
                        status_code=413,
                        content='{"detail":"Request too large. Maximum 10 MB for uploads."}',
                        media_type="application/json",
                    )
            elif size > MAX_JSON_BODY:
                return Response(
                    status_code=413,
                    content='{"detail":"Request too large. Maximum 1 MB for JSON payloads."}',
                    media_type="application/json",
                )
    return await call_next(request)


# Security middleware - Trusted Host
allowed_hosts_raw = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1")
allowed_hosts = allowed_hosts_raw.split(",")
if "*" in allowed_hosts and os.getenv("ENVIRONMENT", "development") != "development":
    import logging

    logging.warning(
        "ALLOWED_HOSTS contains '*' — TrustedHostMiddleware is disabled! Set specific hosts in production."
    )
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# CORS middleware - configurable via environment
cors_origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://localhost:3001"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if os.getenv("HSTS_ENABLED", "False").lower() == "true":
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    )
    return response


# Request logging middleware for security audit
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time
    import uuid

    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()

    response = await call_next(request)

    process_time = (time.time() - start_time) * 1000
    client_host = request.client.host if request.client else "unknown"

    log_msg = (
        f"[{request_id}] {client_host} - {request.method} {request.url.path} "
        f"- {response.status_code} - {process_time:.2f}ms"
    )

    if response.status_code >= 500:
        logging.error(log_msg)
    elif response.status_code >= 400:
        logging.warning(log_msg)
    else:
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
app.include_router(audit.router, prefix="/audit", tags=["Audit"])
app.include_router(themes.router, prefix="/themes", tags=["Themes"])

# Serve uploaded photos statically
import os

uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/")
def read_root():
    return {"message": "CKB Tracker API is live!"}
