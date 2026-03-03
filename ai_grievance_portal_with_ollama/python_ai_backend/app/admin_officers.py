from typing import Generator

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from .database import SessionLocal
from .models import Officer

router = APIRouter(prefix="/admin/officers", tags=["admin-officers"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class OfficerCreate(BaseModel):
    name: str
    department: str
    email: str
    password: str


@router.get("/")
def list_officers(db: Session = Depends(get_db)):
    return db.query(Officer).all()


@router.post("/")
def create_officer(body: OfficerCreate, db: Session = Depends(get_db)):
    existing = db.query(Officer).filter(Officer.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    officer = Officer(
        name=body.name,
        department=body.department,
        email=body.email,
        password_hash=pwd_context.hash(body.password),
    )
    db.add(officer)
    db.commit()
    db.refresh(officer)
    return officer
