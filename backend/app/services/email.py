import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
INVITE_FROM_EMAIL = os.getenv("INVITE_FROM_EMAIL", SMTP_USER)
INVITE_BASE_URL = os.getenv("INVITE_BASE_URL", "http://localhost:3000")


def resolve_base_url(request) -> str:
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")
    referer = request.headers.get("referer")
    if referer:
        from urllib.parse import urlparse

        parsed = urlparse(referer)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"
    return INVITE_BASE_URL


def _send_email(recipient_email: str, subject: str, html_body: str, text_body: str) -> bool:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        logging.warning("SMTP not configured — skipping email to %s", recipient_email)
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = INVITE_FROM_EMAIL
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        logging.info("Email sent to %s", recipient_email)
        return True
    except Exception as e:
        logging.error("Failed to send email to %s: %s", recipient_email, e)
        return False


def _html_wrap(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Inter,system-ui,sans-serif;background:#0f0f0f;color:#e0e0e0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:48px 16px;">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
<tr><td style="background:#1a1a1a;border-radius:12px;padding:40px 32px;border:1px solid #2a2a2a;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:24px;">
<span style="font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.5px;">CKB Tracker</span>
</td></tr>
<tr><td style="padding-bottom:8px;">
<h1 style="margin:0;font-size:20px;font-weight:600;color:#fff;">{title}</h1>
</td></tr>
{body_html}
</table>
</td></tr>
<tr><td style="text-align:center;padding-top:24px;">
<span style="font-size:12px;color:#666;">CKB Tracker — Martial Arts Class Management</span>
</td></tr>
</table>
</td></tr></table>
</body>
</html>"""


def send_test_email(recipient_email: str) -> bool:
    text_body = (
        "This is a test email from CKB Tracker. If you received this, your SMTP configuration is working correctly."
    )
    html_body = _html_wrap(
        "Test Email",
        """<tr><td style="padding-bottom:16px;">
<p style="margin:0;font-size:14px;line-height:1.6;color:#a0a0a0;">
This is a test email from <strong style="color:#fff;">CKB Tracker</strong>. If you received this, your SMTP configuration is working correctly.
</p>
</td></tr>""",
    )
    return _send_email(recipient_email, "CKB Tracker — Test Email", html_body, text_body)


def send_invite_email(recipient_email: str, first_name: str, token: str, base_url: Optional[str] = None) -> bool:
    invite_link = f"{base_url or INVITE_BASE_URL}/accept-invite?token={token}"

    text_body = (
        f"Hi {first_name},\n\n"
        f"You've been added to CKB Tracker!\n\n"
        f"Set up your password and PIN here:\n{invite_link}\n\n"
        f"This link expires in 7 days.\n\n"
        f"See you on the mats!"
    )

    html_body = _html_wrap(
        "You're Invited!",
        f"""<tr><td style="padding-bottom:16px;">
<p style="margin:0;font-size:14px;line-height:1.6;color:#a0a0a0;">Hi {first_name},</p>
<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#a0a0a0;">
You've been added to <strong style="color:#fff;">CKB Tracker</strong>. Set up your password and PIN to get started.
</p>
</td></tr>
<tr><td style="padding-bottom:16px;">
<a href="{invite_link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Set Up Account</a>
</td></tr>
<tr><td>
<p style="margin:0;font-size:12px;color:#666;">This link expires in 7 days.</p>
</td></tr>""",
    )

    return _send_email(recipient_email, "You're invited to CKB Tracker", html_body, text_body)


def send_password_reset_email(
    recipient_email: str, first_name: str, token: str, base_url: Optional[str] = None
) -> bool:
    reset_link = f"{base_url or INVITE_BASE_URL}/reset-password?token={token}"

    text_body = (
        f"Hi {first_name},\n\n"
        f"A password reset was requested for your CKB Tracker account.\n\n"
        f"Reset your password here:\n{reset_link}\n\n"
        f"This link expires in 1 hour.\n\n"
        f"If you didn't request this, you can ignore this email."
    )

    html_body = _html_wrap(
        "Reset Your Password",
        f"""<tr><td style="padding-bottom:16px;">
<p style="margin:0;font-size:14px;line-height:1.6;color:#a0a0a0;">Hi {first_name},</p>
<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#a0a0a0;">
A password reset was requested for your account.
</p>
</td></tr>
<tr><td style="padding-bottom:16px;">
<a href="{reset_link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Reset Password</a>
</td></tr>
<tr><td>
<p style="margin:0;font-size:12px;color:#666;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
</td></tr>""",
    )

    return _send_email(recipient_email, "CKB Tracker — Password Reset", html_body, text_body)


def send_pin_reset_email(recipient_email: str, first_name: str, token: str, base_url: Optional[str] = None) -> bool:
    reset_link = f"{base_url or INVITE_BASE_URL}/reset-pin?token={token}"

    text_body = (
        f"Hi {first_name},\n\n"
        f"A PIN reset was requested for your CKB Tracker account.\n\n"
        f"Reset your PIN here:\n{reset_link}\n\n"
        f"This link expires in 1 hour.\n\n"
        f"If you didn't request this, you can ignore this email."
    )

    html_body = _html_wrap(
        "Reset Your PIN",
        f"""<tr><td style="padding-bottom:16px;">
<p style="margin:0;font-size:14px;line-height:1.6;color:#a0a0a0;">Hi {first_name},</p>
<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#a0a0a0;">
A PIN reset was requested for your account. You'll use this PIN to check in at the kiosk.
</p>
</td></tr>
<tr><td style="padding-bottom:16px;">
<a href="{reset_link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Reset PIN</a>
</td></tr>
<tr><td>
<p style="margin:0;font-size:12px;color:#666;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
</td></tr>""",
    )

    return _send_email(recipient_email, "CKB Tracker — PIN Reset", html_body, text_body)
