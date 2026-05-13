"""Outbound transactional email via SendGrid.

Configuration lives in environment variables and is read lazily so the app
still boots without SendGrid configured — emails will simply be logged to
stdout in that case, which keeps local dev and unit tests working without a
network dependency.

Required env vars in production:

* ``SENDGRID_API_KEY``     — API key created in the SendGrid dashboard
* ``EMAIL_FROM``           — verified sender, e.g. ``no-reply@gamgee.app``
* ``EMAIL_FROM_NAME``      — display name, default ``Gamgee``
* ``APP_BASE_URL``         — public URL of the frontend, e.g. ``https://gamgee.app``
                             (used to build reset/verify links)

See ``docs/sendgrid-setup.md`` for the full DNS + Cloudflare tunnel walkthrough.
"""
from __future__ import annotations

import logging
import os
from typing import Final

log = logging.getLogger("gamgee.email")

_SENDGRID_ENDPOINT: Final = "https://api.sendgrid.com/v3/mail/send"


def _env(name: str, default: str | None = None) -> str | None:
    val = os.environ.get(name, default)
    return val.strip() if isinstance(val, str) and val.strip() else None


def app_base_url() -> str:
    return _env("APP_BASE_URL") or "http://localhost:5173"


def _is_configured() -> bool:
    return bool(_env("SENDGRID_API_KEY") and _env("EMAIL_FROM"))


def _send_via_sendgrid(to: str, subject: str, html: str, text_body: str) -> bool:
    api_key = _env("SENDGRID_API_KEY")
    sender  = _env("EMAIL_FROM")
    if not api_key or not sender:
        return False

    # Imported here so the dependency is optional at install time.
    try:
        import httpx  # type: ignore
    except ImportError:  # pragma: no cover
        log.error("httpx is required for SendGrid; falling back to log-only mode")
        return False

    payload = {
        "personalizations": [{"to": [{"email": to}]}],
        "from": {"email": sender, "name": _env("EMAIL_FROM_NAME") or "Gamgee"},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": text_body},
            {"type": "text/html",  "value": html},
        ],
    }
    try:
        res = httpx.post(
            _SENDGRID_ENDPOINT,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=10.0,
        )
    except Exception as exc:  # pragma: no cover - network errors logged, not raised
        log.error("SendGrid request failed: %s", exc)
        return False

    if res.status_code >= 300:
        log.error("SendGrid rejected message (%s): %s", res.status_code, res.text[:500])
        return False
    return True


def _send(to: str, subject: str, html: str, text_body: str) -> bool:
    """Send an email; returns True if the provider accepted it.

    When SendGrid isn't configured (local dev, CI), the message is logged at
    INFO level so links remain testable from the server logs.
    """
    if not _is_configured():
        log.info("[email-dev] to=%s subject=%s\n%s", to, subject, text_body)
        return True
    return _send_via_sendgrid(to, subject, html, text_body)


# ── Public templates ─────────────────────────────────────────────────────────

def send_verification_email(to: str, name: str | None, token: str) -> bool:
    link = f"{app_base_url()}/verify-email?token={token}"
    safe_name = name or "there"
    subject = "Verify your Gamgee account"
    text_body = (
        f"Hi {safe_name},\n\n"
        f"Welcome to Gamgee! Please confirm your email address by clicking the link below:\n\n"
        f"{link}\n\n"
        f"This link expires in 48 hours. If you didn't create an account, you can ignore this message.\n"
    )
    html = f"""\
<!doctype html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#222">
  <h2 style="color:#28D1FF;margin-bottom:0.5em">Welcome to Gamgee</h2>
  <p>Hi {safe_name},</p>
  <p>Please confirm your email address so we can keep your account secure.</p>
  <p>
    <a href="{link}" style="display:inline-block;padding:12px 20px;background:#28D1FF;color:#04161E;border-radius:8px;text-decoration:none;font-weight:600">
      Verify my email
    </a>
  </p>
  <p style="color:#666;font-size:14px">Or paste this link in your browser:<br><span style="word-break:break-all">{link}</span></p>
  <p style="color:#888;font-size:13px">This link expires in 48 hours. If you didn't create an account, you can ignore this email.</p>
</body></html>
"""
    return _send(to, subject, html, text_body)


def send_password_reset_email(to: str, name: str | None, token: str) -> bool:
    link = f"{app_base_url()}/reset-password?token={token}"
    safe_name = name or "there"
    subject = "Reset your Gamgee password"
    text_body = (
        f"Hi {safe_name},\n\n"
        f"We received a request to reset the password for your Gamgee account. "
        f"If that was you, click the link below to choose a new password:\n\n"
        f"{link}\n\n"
        f"This link expires in 60 minutes. If you didn't request a reset, you can safely ignore this email.\n"
    )
    html = f"""\
<!doctype html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#222">
  <h2 style="color:#28D1FF;margin-bottom:0.5em">Password reset</h2>
  <p>Hi {safe_name},</p>
  <p>We received a request to reset the password for your Gamgee account.</p>
  <p>
    <a href="{link}" style="display:inline-block;padding:12px 20px;background:#28D1FF;color:#04161E;border-radius:8px;text-decoration:none;font-weight:600">
      Reset my password
    </a>
  </p>
  <p style="color:#666;font-size:14px">Or paste this link in your browser:<br><span style="word-break:break-all">{link}</span></p>
  <p style="color:#888;font-size:13px">This link expires in 60 minutes. If you didn't request a reset, you can safely ignore this message — your password won't change.</p>
</body></html>
"""
    return _send(to, subject, html, text_body)


def send_admin_password_reset_notice(to: str, name: str | None, new_password: str, actor: str) -> bool:
    """Notify a user that an admin reset their password.

    The new password is sent in the body so the user can sign in; they should
    change it immediately. Use sparingly — prefer the reset-link flow when the
    user has a working email.
    """
    safe_name = name or "there"
    subject = "Your Gamgee password was reset by an administrator"
    text_body = (
        f"Hi {safe_name},\n\n"
        f"An administrator ({actor}) reset the password on your Gamgee account.\n\n"
        f"Your temporary password is:\n\n"
        f"    {new_password}\n\n"
        f"Sign in and change it immediately from Profile → Change Password.\n"
        f"If you weren't expecting this change, contact your administrator right away.\n"
    )
    html = f"""\
<!doctype html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#222">
  <h2 style="color:#28D1FF;margin-bottom:0.5em">Your password was reset</h2>
  <p>Hi {safe_name},</p>
  <p>An administrator (<strong>{actor}</strong>) reset the password on your Gamgee account.</p>
  <p>Your temporary password is:</p>
  <pre style="background:#f4f6f8;padding:14px;border-radius:8px;font-size:16px">{new_password}</pre>
  <p>Sign in and change it immediately from <em>Profile → Change Password</em>.</p>
  <p style="color:#888;font-size:13px">If you weren't expecting this, contact your administrator right away.</p>
</body></html>
"""
    return _send(to, subject, html, text_body)


__all__ = [
    "app_base_url",
    "send_verification_email",
    "send_password_reset_email",
    "send_admin_password_reset_notice",
]
