import os
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/templates_db")

# Use echo=True while developing to see SQL logs
engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

def init_db():
    from .models import Template, TemplateVersion
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
