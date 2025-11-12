from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .database import get_session
from app.crud import (
    create_template_version, get_template_version, list_templates, get_template_by_code
)
from app.schemas import (
    TemplateVersionCreate, TemplateVersionOut, RenderRequest,
    RenderResponse, ListResponse, PaginationMeta, TemplateOut
)
from app.utils import render_subject_and_body

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])

@router.post("/", response_model=TemplateVersionOut)
def create_template_version_endpoint(payload: TemplateVersionCreate, session: Session = Depends(get_session)):
    tv = create_template_version(session, payload)
    return tv

@router.get("/", response_model=ListResponse)
def list_templates_endpoint(limit: int = Query(20, ge=1, le=100), page: int = Query(1, ge=1), session: Session = Depends(get_session)):
    items, total = list_templates(session, limit=limit, page=page)
    total_pages = (total + limit - 1) // limit if total else 0
    meta = PaginationMeta(
        total=total,
        limit=limit,
        page=page,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1
    )
    return ListResponse(success=True, data=[TemplateOut.from_orm(i) for i in items], message="ok", meta=meta)

@router.get("/get", response_model=TemplateVersionOut)
def get_template_version_endpoint(template_code: str, language: str = "en", version_number: int | None = None, session: Session = Depends(get_session)):
    tv = get_template_version(session, template_code, language, version_number)
    if not tv:
        raise HTTPException(status_code=404, detail="template_not_found")
    return tv

@router.post("/render", response_model=RenderResponse)
def render_endpoint(req: RenderRequest, session: Session = Depends(get_session)):
    tv = get_template_version(session, req.template_code, req.language or "en", req.version_number)
    if not tv:
        raise HTTPException(status_code=404, detail="template_not_found")
    subject, body = render_subject_and_body(tv.subject, tv.body, req.variables or {})
    return RenderResponse(subject=subject, body=body)
