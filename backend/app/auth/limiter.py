from slowapi import Limiter
from slowapi.util import get_remote_address

# Tiered rate limit definitions
# Apply via @limiter.limit() decorator on each endpoint.

# Tier 1: Strict - Authentication & sensitive operations
AUTH_LIMIT = "5/minute"  # Login, kiosk unlock
PIN_LIMIT = "10/minute"  # PIN verification operations
REGISTRATION_LIMIT = "5/minute"  # User registration

# Tier 2: Moderate - Write operations
WRITE_LIMIT = "20/minute"  # General create/update/delete
CSV_IMPORT_LIMIT = "5/minute"  # CSV import (expensive)
UPLOAD_LIMIT = "10/minute"  # Photo uploads

# Tier 3: Standard - Read operations & token refresh
REFRESH_LIMIT = "10/minute"  # Token refresh
READ_LIMIT = "60/minute"  # General read/list
CSV_EXPORT_LIMIT = "10/minute"  # CSV/data export
DASHBOARD_LIMIT = "30/minute"  # Dashboard/stats queries

# Tier 4: Invites & password resets
INVITE_LIMIT = "10/minute"  # Sending invites
RESET_LIMIT = "3/minute"  # Password/PIN reset requests

# Tier 5: Restricted - Database administration
DB_EXPORT_LIMIT = "10/minute"  # Database backup/export
DB_RESET_LIMIT = "1/minute"  # Database reset (destructive)
DB_RESTORE_LIMIT = "1/minute"  # Database restore (destructive)

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
