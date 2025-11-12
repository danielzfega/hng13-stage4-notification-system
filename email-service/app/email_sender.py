import os
from email.message import EmailMessage
import aiosmtplib
import httpx
from app.circuit_breaker import CircuitBreaker

# --- Environment Configuration ---
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_SENDER = os.getenv("SMTP_SENDER", SMTP_USERNAME or "no-reply@example.com")
TEMPLATE_SERVICE_URL = os.getenv("TEMPLATE_SERVICE_URL", "http://template-service:8001")

cb = CircuitBreaker(fail_threshold=5, reset_timeout=30)


# --- SMTP Send Function ---
@cb
async def _send_smtp(to: str, subject: str, body: str):
    """
    Sends email via Gmail SMTP using aiosmtplib with STARTTLS
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        raise ValueError("SMTP credentials are missing. Please set SMTP_USERNAME and SMTP_PASSWORD in environment.")

    message = EmailMessage()
    message["From"] = SMTP_SENDER
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body, subtype="html")  # use HTML-capable content

    # Gmail requires STARTTLS on port 587
    await aiosmtplib.send(
        message,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        start_tls=True,
        username=SMTP_USERNAME,
        password=SMTP_PASSWORD,
        timeout=15.0,
    )

    return True


# --- Template Rendering ---
async def render_template(template_name: str, variables: dict):
    """
    Calls the Template Service render endpoint to build subject/body dynamically.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{TEMPLATE_SERVICE_URL}/templates/render",
            json={"template_name": template_name, "variables": variables},
        )
        resp.raise_for_status()
        return resp.json()  # Expected {"subject": "...", "body": "..."}


# --- High-Level Send Entry Point ---
async def send_email(payload: dict):
    """
    Sends email directly or via a rendered template.

    payload must include:
      - "to"
      - either ("subject" and "body") or ("template_name" and "variables")
    """
    if payload.get("subject") and payload.get("body"):
        subject, body = payload["subject"], payload["body"]
    elif payload.get("template_name"):
        rendered = await render_template(payload["template_name"], payload.get("variables") or {})
        subject, body = rendered["subject"], rendered["body"]
    else:
        raise ValueError("Invalid payload. Provide subject/body or template_name + variables.")

    return await _send_smtp(payload["to"], subject, body)
