from sqlmodel import select, Session
from typing import Optional, Tuple, List
from .models import Template, TemplateVersion
from .schemas import TemplateVersionCreate

def get_template_by_code(session: Session, code: str) -> Optional[Template]:
    stmt = select(Template).where(Template.code == code)
    return session.exec(stmt).first()

def create_template_if_missing(session: Session, code: str, template_type: str = "email", default_language: str = "en") -> Template:
    tpl = get_template_by_code(session, code)
    if tpl:
        return tpl
    tpl = Template(code=code, template_type=template_type, default_language=default_language)
    session.add(tpl)
    session.commit()
    session.refresh(tpl)
    return tpl

def create_template_version(session: Session, payload: TemplateVersionCreate) -> TemplateVersion:
    tpl = create_template_if_missing(session, payload.template_code, payload.template_type or "email", payload.language or "en")
    # find latest version for this template + language
    stmt = select(TemplateVersion).where(
        TemplateVersion.template_id == tpl.id,
        TemplateVersion.language == (payload.language or "en")
    ).order_by(TemplateVersion.version_number.desc())
    last = session.exec(stmt).first()
    next_version = 1 if not last else last.version_number + 1
    tv = TemplateVersion(
        template_id=tpl.id,
        language=payload.language or "en",
        version_number=next_version,
        subject=payload.subject,
        body=payload.body,
        changelog=payload.changelog
    )
    session.add(tv)
    session.commit()
    session.refresh(tv)
    return tv

def get_template_version(session: Session, template_code: str, language: str = "en", version_number: Optional[int] = None) -> Optional[TemplateVersion]:
    tpl = get_template_by_code(session, template_code)
    if not tpl:
        return None
    if version_number:
        stmt = select(TemplateVersion).where(
            TemplateVersion.template_id == tpl.id,
            TemplateVersion.language == language,
            TemplateVersion.version_number == version_number
        )
        return session.exec(stmt).first()
    stmt = select(TemplateVersion).where(
        TemplateVersion.template_id == tpl.id,
        TemplateVersion.language == language
    ).order_by(TemplateVersion.version_number.desc())
    return session.exec(stmt).first()

def list_templates(session: Session, limit: int = 20, page: int = 1) -> Tuple[List[Template], int]:
    offset = (page - 1) * limit
    total = session.exec(select(Template)).all()
    items = session.exec(select(Template).offset(offset).limit(limit)).all()
    return items, len(total)
