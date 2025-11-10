import os
from email.message import EmailMessage
import aiosmtplib
import httpx
from .circuit_breaker import CircuitBreaker

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.mailtrap.io")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_SENDER = os.getenv("SMTP_SENDER", "no-reply@example.com")
TEMPLATE_SERVICE_URL = os.getenv("TEMPLATE_SERVICE_URL", "http://template-service:8001")
cb = CircuitBreaker(fail_threshold=5, reset_timeout=30)

@cb
async def _send_smtp(to: str, subject: str, body: str):
    message = EmailMessage()
    message["From"] = SMTP_SENDER
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    await aiosmtplib.send(
        message,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        start_tls=True,
        username=SMTP_USERNAME or None,
        password=SMTP_PASSWORD or None,
    )
    return True

async def render_template(template_name: str, variables: dict):
    # call Template Service render endpoint
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(f"{TEMPLATE_SERVICE_URL}/templates/render", json={
            "template_name": template_name,
            "variables": variables
        }, timeout=15.0)
        resp.raise_for_status()
        return resp.json()  # expected {"subject": "...", "body": "..."}

async def send_email(payload: dict):
    """
    payload must be dict with keys: to, subject/body OR template_name+variables
    """
    if payload.get("subject") and payload.get("body"):
        subject, body = payload["subject"], payload["body"]
    elif payload.get("template_name"):
        rendered = await render_template(payload["template_name"], payload.get("variables") or {})
        subject, body = rendered["subject"], rendered["body"]
    else:
        raise ValueError("No subject/body or template specified")

    # attempt to send via SMTP (circuit-breaker decorated)
    return await _send_smtp(payload["to"], subject, body)
