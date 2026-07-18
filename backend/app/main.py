from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.auth.limiter import limiter
from app.auth.csrf import csrf_middleware_dispatch
from slowapi.errors import RateLimitExceeded
import os
import logging

from app.database import SessionLocal
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
    rank_tiers,
    points_adjustments,
    admin,
)


@asynccontextmanager
async def lifespan(application: FastAPI):
    db = SessionLocal()
    try:
        # Seed rank tiers
        existing_tiers = db.query(models.RankTier).count()
        if existing_tiers == 0:
            ranks = ["White", "Blue", "Purple", "Brown", "Black", "Coral", "Red"]
            sort_order = 0
            for rank in ranks:
                for degree in range(5):
                    if degree == 0:
                        display_name = f"{rank} Belt"
                    else:
                        degree_suffix = (
                            "1st" if degree == 1 else "2nd" if degree == 2 else "3rd" if degree == 3 else "4th"
                        )
                        display_name = f"{rank} Belt {degree_suffix} Degree"

                    is_terminal = rank == "Red" and degree == 4
                    tier = models.RankTier(
                        rank=rank,
                        degree=degree,
                        display_name=display_name,
                        target_points=None if is_terminal else 500.0,
                        sort_order=sort_order,
                    )
                    db.add(tier)
                    sort_order += 1
            db.commit()
            logging.info("Seeded 35 rank tiers with 500 default target points")

        # Backfill rank_tier_id for existing users that don't have one
        try:
            users_without_tier = (
                db.query(models.User)
                .filter(
                    models.User.rank_tier_id.is_(None),
                    models.User.is_current,
                )
                .all()
            )
            if users_without_tier:
                for u in users_without_tier:
                    tier = (
                        db.query(models.RankTier)
                        .filter(
                            models.RankTier.rank == u.rank,
                            models.RankTier.degree == 0,
                        )
                        .first()
                    )
                    if tier:
                        u.rank_tier_id = tier.id
                db.commit()
                logging.info(f"Backfilled rank_tier_id for {len(users_without_tier)} users")
        except Exception as e:
            db.rollback()
            logging.warning(f"Could not backfill rank_tier_id (column may not exist yet): {e}")
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

    logging.warning("ALLOWED_HOSTS contains '*' — TrustedHostMiddleware is disabled! Set specific hosts in production.")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# CORS middleware - configurable via environment
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX", r"https://ckb-tracker-.*\.vercel\.app"),
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
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
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


# Include routers
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(classes.router, prefix="/classes", tags=["Classes"])
app.include_router(class_instances.router, prefix="/class-instances", tags=["Class Instances"])
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
app.include_router(rank_tiers.router, prefix="/rank-tiers", tags=["Rank Tiers"])
app.include_router(
    points_adjustments.router,
    prefix="/points-adjustments",
    tags=["Points Adjustments"],
)
app.include_router(admin.router)

# Serve uploaded photos statically
import os

uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/debug/db")
def debug_db():
    import os
    from sqlalchemy import text
    from app.database import SessionLocal

    db_url = os.getenv("DATABASE_URL", "NOT SET")
    masked = db_url[:20] + "..." if len(db_url) > 20 else db_url
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        emails = [r[0] for r in db.execute(text("SELECT email FROM users")).fetchall()]
        db.close()
        return {
            "db_url_prefix": masked,
            "dialect": db_url.split(":")[0] if ":" in db_url else "unknown",
            "user_count": count,
            "emails": emails,
        }
    except Exception as e:
        return {"db_url_prefix": masked, "error": str(e)}


@app.get("/debug/login/{email}")
def debug_login(email: str):
    import traceback
    from app.database import SessionLocal
    from app import models
    from app.auth.jwt_utils import create_access_token, create_refresh_token, store_token_record
    from app.auth.config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
    from datetime import timedelta
    from app.routers.auth import get_user_roles

    steps = []
    db = SessionLocal()
    try:
        steps.append("1. query user")
        user = db.query(models.User).filter(models.User.email == email, models.User.is_current).first()
        if not user:
            return {"steps": steps, "error": "user not found"}
        steps.append(f"2. user found: {user.email}, uuid={user.user_uuid}")

        steps.append("3. get_user_roles")
        roles = get_user_roles(db, user.user_uuid)
        steps.append(f"4. roles: {roles}")

        steps.append("5. create_access_token")
        access_token, access_jti = create_access_token(user.user_uuid)
        steps.append("6. access_token created")

        steps.append("7. create_refresh_token")
        refresh_token, refresh_jti = create_refresh_token(user.user_uuid)
        steps.append("8. refresh_token created")

        steps.append("9. store access token")
        from datetime import datetime as _dt, timezone as _tz

        store_token_record(
            db,
            access_jti,
            str(user.user_uuid),
            "access",
            _dt.now(_tz.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        steps.append("10. access token stored")

        steps.append("11. store refresh token")
        store_token_record(
            db,
            refresh_jti,
            str(user.user_uuid),
            "refresh",
            _dt.now(_tz.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )
        steps.append("12. refresh token stored")

        steps.append("13. ALL PASSED")
        return {"steps": steps}
    except Exception as e:
        steps.append(f"ERROR: {type(e).__name__}: {e}")
        return {"steps": steps, "traceback": traceback.format_exc()}
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"message": "CKB Tracker API is live!"}
