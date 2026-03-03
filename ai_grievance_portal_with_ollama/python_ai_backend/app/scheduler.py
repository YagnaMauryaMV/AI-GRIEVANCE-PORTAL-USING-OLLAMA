from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

from .database import SessionLocal
from .models import Ticket

scheduler = BackgroundScheduler()


def check_sla_and_mark_overdue():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        tickets = (
            db.query(Ticket)
            .filter(
                Ticket.sla_due_at < now,
                Ticket.status.notin_(["CLOSED", "OVERDUE"]),
            )
            .all()
        )
        for t in tickets:
            t.status = "OVERDUE"
            print(f"[SLA] Ticket #{t.id} marked OVERDUE")
            # TODO: send SMS or trigger calls here
        db.commit()
    finally:
        db.close()


scheduler.add_job(check_sla_and_mark_overdue, "interval", minutes=5)
