from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class Template(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, nullable=False)
    template_type: str = Field(default="email")  # email|push_web|push_mobile
    default_language: str = Field(default="en")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    versions: List["TemplateVersion"] = Relationship(back_populates="template")


class TemplateVersion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    template_id: int = Field(foreign_key="template.id")
    language: str = Field(default="en", index=True)
    version_number: int = Field(default=1)
    subject: Optional[str] = Field(default=None)  # for email
    body: str  # template content: html/text or JSON string for push
    changelog: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    template: Optional[Template] = Relationship(back_populates="versions")
