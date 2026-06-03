"""Test the verify-pin-for-user endpoint directly."""

import asyncio
import json
from app.main import app
from app.database import SessionLocal, engine
from app import models

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)


async def test():
    # Get a test client
    from httpx import AsyncClient

    async with AsyncClient(app=app, base_url="http://test") as client:
        # Test 1: Valid PIN
        resp = await client.post(
            "/kiosk/verify-pin-for-user",
            json={"user_uuid": "9a603931-2b41-4602-b61e-e4e67293788a", "pin": "1001"},
        )
        print(f"Valid PIN: {resp.status_code} {resp.json()}")

        # Test 2: Invalid PIN
        resp = await client.post(
            "/kiosk/verify-pin-for-user",
            json={"user_uuid": "9a603931-2b41-4602-b61e-e4e67293788a", "pin": "0000"},
        )
        print(f"Invalid PIN: {resp.status_code} {resp.json()}")

        # Test 3: Non-existent user
        resp = await client.post(
            "/kiosk/verify-pin-for-user",
            json={"user_uuid": "00000000-0000-0000-0000-000000000000", "pin": "1001"},
        )
        print(f"No user: {resp.status_code} {resp.json()}")


asyncio.run(test())
