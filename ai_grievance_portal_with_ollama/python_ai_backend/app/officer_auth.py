from typing import Generator

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from .database import SessionLocal
from .models import Officer

router = APIRouter(prefix="/officer", tags=["officer-auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class OfficerLoginRequest(BaseModel):
    email: str
    password: str


class OfficerLoginResponse(BaseModel):
    id: int
    name: str
    department: str
    email: str


@router.post("/login", response_model=OfficerLoginResponse)
def officer_login(payload: OfficerLoginRequest, db: Session = Depends(get_db)):
    officer = db.query(Officer).filter(Officer.email == payload.email).first()
    if not officer or not pwd_context.verify(payload.password, officer.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return OfficerLoginResponse(
        id=officer.id,
        name=officer.name,
        department=officer.department,
        email=officer.email,
    )
