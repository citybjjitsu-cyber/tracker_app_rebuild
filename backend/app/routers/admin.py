from fastapi import APIRouter, Depends, HTTPException
from app import models
from app.routers.auth import get_admin_user
from app.auth.limiter import limiter
from starlette.requests import Request
import logging

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/seed")
@limiter.limit("1/minute")
def seed_database(
    request: Request,
    user: models.User = Depends(get_admin_user),
):
    try:
        from seed_complete_data import seed_data

        seed_data()
        return {"message": "Database seeded successfully"}
    except Exception as e:
        logging.error(f"Seed failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
