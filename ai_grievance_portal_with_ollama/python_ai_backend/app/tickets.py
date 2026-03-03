from datetime import datetime, timedelta
from typing import Generator, Optional

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Ticket, User
from .utils import get_sla_days

router = APIRouter(prefix="/tickets", tags=["tickets"])


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class TicketCreate(BaseModel):
    user_id: int
    description: str
    category: str
    subcategory: Optional[str] = None
    sentiment: str = "neutral"
    severity_level: str = "normal"
    department: str = "General"


class ObjectionRequest(BaseModel):
    user_id: int
    reason: str


@router.get("/my")
def list_my_tickets(user_id: int, db: Session = Depends(get_db)):
    tickets = (
        db.query(Ticket)
        .filter(Ticket.user_id == user_id)
        .order_by(Ticket.created_at.desc())
        .all()
    )
    return tickets


@router.post("/")
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sla_days = get_sla_days(db, payload.category, payload.severity_level)
    sla_due_at = datetime.utcnow() + timedelta(days=sla_days)

    ticket = Ticket(
        user_id=payload.user_id,
        description=payload.description,
        category=payload.category,
        subcategory=payload.subcategory,
        sentiment=payload.sentiment,
        severity_level=payload.severity_level,
        department=payload.department,
        sla_due_at=sla_due_at,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # TODO: send SMS confirmation

    return ticket


@router.post("/{ticket_id}/object")
def raise_objection(
    ticket_id: int = Path(...),
    body: ObjectionRequest = None,
    db: Session = Depends(get_db),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.user_id != body.user_id:
        raise HTTPException(status_code=403, detail="Not your ticket")

    if ticket.status not in ["RESOLVED_PENDING_CONFIRMATION", "CLOSED"]:
        raise HTTPException(status_code=400, detail="Ticket is not marked as resolved")

    ticket.status = "REOPENED"
    ticket.last_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)

    # TODO: notify officer + admin, store objection text if needed

    return {"message": "Objection recorded, ticket reopened", "ticket": ticket}
