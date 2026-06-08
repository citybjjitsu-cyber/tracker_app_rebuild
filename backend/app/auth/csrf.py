import secrets
from fastapi import Request, HTTPException
from app.auth.config import CSRF_TOKEN_COOKIE_NAME, CSRF_HEADER_NAME

SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def validate_csrf_token(request, token_from_cookie: str) -> bool:
    token_from_header = request.headers.get(CSRF_HEADER_NAME)
    if not token_from_header or not token_from_cookie:
        return False
    return secrets.compare_digest(token_from_header, token_from_cookie)


async def csrf_middleware_dispatch(request: Request, call_next):
    if request.method in SAFE_METHODS:
        return await call_next(request)

    # Only enforce CSRF when there's a session cookie AND no Bearer token
    access_cookie = request.cookies.get("access_token")
    auth_header = request.headers.get("Authorization", "")
    if access_cookie and not auth_header.startswith("Bearer "):
        csrf_cookie = request.cookies.get(CSRF_TOKEN_COOKIE_NAME) or ""
        if not csrf_cookie or not validate_csrf_token(request, csrf_cookie):
            raise HTTPException(
                status_code=403,
                detail="CSRF validation failed. Include X-CSRF-Token header matching csrf_token cookie.",
            )
    return await call_next(request)
