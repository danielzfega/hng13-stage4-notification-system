from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

# Request/response use snake_case field names

class TemplateVersionCreate(BaseModel):
    template_code: str = Field(..., alias="template_code")
    template_type: Optional[str] = "email"   # email|push_web|push_mobile
    language: Optional[str] = "en"
    subject: Optional[str] = None
    body: str
    changelog: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        schema_extra = {"example": {
            "template_code": "welcome_email",
            "template_type": "email",
            "language": "en",
            "subject": "Welcome {{ name }}",
            "body": "<p>Hi {{ name }}, welcome to {{ app_name }}</p>",
            "changelog": "initial version"
        }}

class TemplateVersionOut(BaseModel):
    id: int
    template_id: int
    language: str
    version_number: int
    subject: Optional[str]
    body: str
    changelog: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True

class TemplateOut(BaseModel):
    id: int
    code: str
    template_type: str
    default_language: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class RenderRequest(BaseModel):
    template_code: str
    variables: Optional[Dict[str, Any]] = {}
    language: Optional[str] = "en"
    version_number: Optional[int] = None

class RenderResponse(BaseModel):
    subject: Optional[str]
    body: str

class PaginationMeta(BaseModel):
    total: int
    limit: int
    page: int
    total_pages: int
    has_next: bool
    has_previous: bool

class ListResponse(BaseModel):
    success: bool
    data: Optional[List[Any]] = None
    message: str
    meta: Optional[PaginationMeta] = None
    error: Optional[str] = None
