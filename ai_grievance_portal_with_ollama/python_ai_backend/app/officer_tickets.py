from datetime import datetime
from typing import Generator

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Ticket, Officer, Evidence, CallLog

router = APIRouter(prefix="/officer/tickets", tags=["officer-tickets"])


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class TicketStatusUpdate(BaseModel):
    officer_id: int
    status: str  # IN_PROGRESS / RESOLVED_PENDING_CONFIRMATION
    evidence_note: str | None = None
    evidence_file_url: str | None = None


class CallLogCreate(BaseModel):
    officer_id: int
    note: str | None = None


@router.get("/assigned")
def list_assigned_tickets(officer_id: int, db: Session = Depends(get_db)):
    officer = db.query(Officer).filter(Officer.id == officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")

    tickets = (
        db.query(Ticket)
        .filter(Ticket.officer_id == officer_id)
        .order_by(Ticket.sla_due_at.asc())
        .all()
    )
    return tickets


@router.get("/{ticket_id}")
def get_ticket(ticket_id: int, officer_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket or ticket.officer_id != officer_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {
        "ticket": ticket,
        "evidences": ticket.evidences,
        "call_logs": ticket.call_logs,
    }


@router.post("/{ticket_id}/status")
def update_ticket_status(ticket_id: int, body: TicketStatusUpdate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.officer_id != body.officer_id:
        raise HTTPException(status_code=403, detail="Not your ticket")

    if body.status not in ["IN_PROGRESS", "RESOLVED_PENDING_CONFIRMATION"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    ticket.status = body.status
    ticket.last_updated_at = datetime.utcnow()

    if body.status == "RESOLVED_PENDING_CONFIRMATION" and (body.evidence_note or body.evidence_file_url):
        ev = Evidence(
            ticket_id=ticket.id,
            officer_id=body.officer_id,
            note=body.evidence_note or "",
            file_url=body.evidence_file_url,
        )
        db.add(ev)

    db.commit()
    db.refresh(ticket)

    # TODO: if RESOLVED_PENDING_CONFIRMATION, send SMS to citizen

    return {"message": "Updated", "ticket": ticket}


@router.post("/{ticket_id}/log-call")
def log_call(ticket_id: int, body: CallLogCreate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.officer_id != body.officer_id:
        raise HTTPException(status_code=403, detail="Not your ticket")

    log = CallLog(
        ticket_id=ticket.id,
        officer_id=body.officer_id,
        user_id=ticket.user_id,
        note=body.note,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {"message": "Call logged", "log": log}
