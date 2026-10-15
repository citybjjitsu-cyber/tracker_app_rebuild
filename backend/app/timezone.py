import os
from datetime import date, datetime, timezone
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Request


def _valid_timezone(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError):
        return None
    return value


def get_request_timezone(request: Optional[Request] = None) -> str:
    configured = _valid_timezone(os.getenv("SITE_TIMEZONE"))
    if configured:
        return configured

    browser_timezone = request.headers.get("X-Client-Timezone") if request else None
    return _valid_timezone(browser_timezone) or "UTC"


def local_today(request: Optional[Request] = None) -> date:
    timezone_name = get_request_timezone(request)
    return datetime.now(ZoneInfo(timezone_name)).date()


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
