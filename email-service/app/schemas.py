from pydantic import BaseModel
from typing import Optional, Dict

class EmailMessagePayload(BaseModel):
    request_id: str                      # idempotency key (must be provided)
    to: str
    subject: Optional[str] = None
    body: Optional[str] = None           # if template already rendered
    template_name: Optional[str] = None  # or template_name + variables
    variables: Optional[Dict[str, str]] = {}
    metadata: Optional[Dict[str, str]] = {}
    # optional: prefer rendered subject/body; otherwise service may fetch template

class SendResult(BaseModel):
    request_id: str
    success: bool
    error: Optional[str] = None