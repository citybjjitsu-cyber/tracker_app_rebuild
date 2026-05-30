"""Seed script to create the CKB Theme as the default active theme."""

import json
from app.database import SessionLocal
from app import models

CKB_THEME_CONFIG = {
    "--background": "#131313",
    "--foreground": "#e5e2e1",
    "--card": "#2a2a2a",
    "--card-foreground": "#e5e2e1",
    "--primary": "#dc2626",
    "--primary-foreground": "#ffffff",
    "--secondary": "#1c1b1b",
    "--secondary-foreground": "#e5e2e1",
    "--muted": "#1c1b1b",
    "--muted-foreground": "#ac8884",
    "--accent": "#353534",
    "--accent-foreground": "#e5e2e1",
    "--destructive": "#ffb4ab",
    "--destructive-foreground": "#690005",
    "--border": "rgba(92, 64, 60, 0.15)",
    "--input": "#353534",
    "--ring": "#dc2626",
    "--radius": "0.25rem",
    "headline_font": "'Space Grotesk', sans-serif",
    "body_font": "'Inter', system-ui, sans-serif",
    "dark": {
        "--background": "#0e0e0e",
        "--foreground": "#e5e2e1",
        "--card": "#1c1b1b",
        "--card-foreground": "#e5e2e1",
        "--primary": "#ffb4ab",
        "--primary-foreground": "#690005",
        "--secondary": "#131313",
        "--secondary-foreground": "#e5e2e1",
        "--muted": "#0e0e0e",
        "--muted-foreground": "#ac8884",
        "--accent": "#1c1b1b",
        "--accent-foreground": "#e5e2e1",
        "--destructive": "#ffb4ab",
        "--destructive-foreground": "#690005",
        "--border": "rgba(92, 64, 60, 0.15)",
        "--input": "#1c1b1b",
        "--ring": "#ffb4ab",
        "--radius": "0.25rem",
    },
    "logo_url": "",
}


def seed_theme():
    db = SessionLocal()
    try:
        existing = (
            db.query(models.WebsiteTheme)
            .filter(models.WebsiteTheme.name == "CKB Theme")
            .first()
        )
        if existing:
            print("CKB Theme already exists, updating config...")
            existing.config = json.dumps(CKB_THEME_CONFIG)
            existing.is_active = True
            db.query(models.WebsiteTheme).filter(
                models.WebsiteTheme.id != existing.id
            ).update({"is_active": False})
        else:
            db.query(models.WebsiteTheme).update({"is_active": False})
            theme = models.WebsiteTheme(
                name="CKB Theme",
                is_active=True,
                config=json.dumps(CKB_THEME_CONFIG),
            )
            db.add(theme)
            print("Created CKB Theme and set as active.")
        db.commit()
        print("Theme seed complete!")
    finally:
        db.close()


if __name__ == "__main__":
    seed_theme()
