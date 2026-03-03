from typing import Generator, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Ticket, Officer

router = APIRouter(prefix="/admin/tickets", tags=["admin-tickets"])


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def list_tickets(
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    department: Optional[str] = None,
    severity: Optional[str] = None,
):
    q = db.query(Ticket)
    if status:
        q = q.filter(Ticket.status == status)
    if department:
        q = q.filter(Ticket.department == department)
    if severity:
        q = q.filter(Ticket.severity_level == severity)
    return q.order_by(Ticket.created_at.desc()).all()


class AdminStatusUpdate(BaseModel):
    status: str  # e.g. REOPENED or CLOSED


@router.post("/{ticket_id}/status")
def admin_update_status(ticket_id: int, body: AdminStatusUpdate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = body.status
    db.commit()
    db.refresh(ticket)
    return ticket


class AdminReassign(BaseModel):
    officer_id: int


@router.post("/{ticket_id}/reassign")
def admin_reassign_ticket(ticket_id: int, body: AdminReassign, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    officer = db.query(Officer).filter(Officer.id == body.officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")

    ticket.officer_id = officer.id
    ticket.department = officer.department
    db.commit()
    db.refresh(ticket)
    return ticket
