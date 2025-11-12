# app/database.py
import os
from sqlmodel import SQLModel, create_engine, Session
from typing import Generator
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/templates_db")

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

def init_db() -> None:
    # 👇 FIXED import path
    from app.models import Template, TemplateVersion  # noqa: F401
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
