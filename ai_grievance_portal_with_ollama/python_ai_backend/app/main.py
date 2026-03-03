from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models
from .auth import router as auth_router
from .ai_chat import router as ai_router
from .tickets import router as tickets_router
from .officer_auth import router as officer_auth_router
from .officer_tickets import router as officer_tickets_router
from .admin_auth import router as admin_auth_router
from .admin_sla import router as admin_sla_router
from .admin_officers import router as admin_officers_router
from .admin_tickets import router as admin_tickets_router
from .scheduler import scheduler

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Citizen Grievance Redressal System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(tickets_router)
app.include_router(officer_auth_router)
app.include_router(officer_tickets_router)
app.include_router(admin_auth_router)
app.include_router(admin_sla_router)
app.include_router(admin_officers_router)
app.include_router(admin_tickets_router)


@app.on_event("startup")
def on_startup():
    if not scheduler.running:
        scheduler.start()
        print("[SCHEDULER] Started SLA scheduler")


@app.on_event("shutdown")
def on_shutdown():
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] Shutdown SLA scheduler")
