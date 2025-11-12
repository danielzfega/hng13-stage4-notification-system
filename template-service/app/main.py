import os
from fastapi import FastAPI
from app.database import init_db
from app.routes import router as templates_router
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8001"))

app = FastAPI(title="template_service", openapi_url="/api/v1/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(templates_router)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health():
    return {"success": True, "message": "ok"}
