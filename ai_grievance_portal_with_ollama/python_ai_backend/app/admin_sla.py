from typing import Generator

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import SLARule

router = APIRouter(prefix="/admin/sla", tags=["admin-sla"])


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class SLARuleCreate(BaseModel):
    category: str
    severity_level: str
    days: int


@router.get("/")
def list_sla_rules(db: Session = Depends(get_db)):
    return db.query(SLARule).all()


@router.post("/")
def create_sla_rule(body: SLARuleCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(SLARule)
        .filter(SLARule.category == body.category, SLARule.severity_level == body.severity_level)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Rule already exists for this category & severity")

    rule = SLARule(
        category=body.category,
        severity_level=body.severity_level.lower(),
        days=body.days,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/{rule_id}")
def update_sla_rule(rule_id: int, body: SLARuleCreate, db: Session = Depends(get_db)):
    rule = db.query(SLARule).filter(SLARule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.category = body.category
    rule.severity_level = body.severity_level.lower()
    rule.days = body.days
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{rule_id}")
def delete_sla_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(SLARule).filter(SLARule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"message": "Deleted"}
