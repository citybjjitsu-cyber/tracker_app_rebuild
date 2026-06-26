import secrets
import string


def generate_secret(length=64):
    alphabet = string.ascii_letters + string.digits + "-_"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_csrf_token():
    return secrets.token_urlsafe(32)


if __name__ == "__main__":
    print("# ============================================================")
    print("# CKB Tracker - Secret Key Generation")
    print("# ============================================================")
    print("#")
    print("# Add these to your .env file or server environment variables.")
    print("# Store securely and NEVER commit to version control.")
    print("#")
    print(f"\nJWT_SECRET_KEY={generate_secret()}")
    print("\n# CSRF secret (used internally)")
    print("# No env var needed — auto-generated per process if not set")
    print(f"# Example CSRF token: {generate_csrf_token()}")
    print()
