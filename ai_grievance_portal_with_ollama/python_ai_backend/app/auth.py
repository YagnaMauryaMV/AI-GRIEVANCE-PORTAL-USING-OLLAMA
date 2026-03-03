# app/auth.py
import random
import string
from datetime import datetime, timedelta
from typing import Generator

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from twilio.rest import Client  # 👈 NEW

from .database import SessionLocal
from .models import User, OTPSession
from .config import settings
from .sms_utils import send_sms

router = APIRouter(prefix="/auth", tags=["citizen-auth"])


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def send_otp_sms_twilio(mobile: str, otp: str) -> None:
    """
    Send OTP via Twilio SMS.
    mobile: Indian mobile without country code, e.g. '9876543210'
    """
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER):
        # Fallback to console log if Twilio is not configured
        print(f"[DEV] OTP for {mobile} (Twilio not configured): {otp}")
        return

    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    # E.164 format for India
    to_number = mobile
    if not mobile.startswith("+"):
        to_number = f"+91{mobile}"

    body = f"Your AI Grievance System OTP is {otp}. It is valid for {settings.OTP_EXPIRY_MINUTES} minutes."

    try:
        message = client.messages.create(
            body=body,
            from_=settings.TWILIO_FROM_NUMBER,
            to=to_number,
        )
        print(f"[Twilio] OTP SMS sent to {to_number}, SID={message.sid}")
    except Exception as e:
        # Don't crash login flow if SMS fails; just log
        print(f"[Twilio] Error sending SMS to {to_number}: {e}")
        print(f"[FALLBACK] OTP for {mobile}: {otp}")


@router.post("/send-otp")
def send_otp(
    name: str,
    mobile: str,
    preferred_language: str = "en",
    db: Session = Depends(get_db),
):
    otp = generate_otp()
    otp_session = OTPSession(mobile=mobile, otp_code=otp)
    db.add(otp_session)

    user = db.query(User).filter(User.mobile == mobile).first()
    if not user:
        user = User(name=name, mobile=mobile, preferred_language=preferred_language)
        db.add(user)

    db.commit()

    # 🔹 SEND REAL SMS VIA TWILIO (with console fallback)
    send_otp_sms_twilio(mobile, otp)

    return {"message": "OTP sent", "mobile": mobile}


@router.post("/verify-otp")
def verify_otp(mobile: str, otp: str, db: Session = Depends(get_db)):
    session = (
        db.query(OTPSession)
        .filter(OTPSession.mobile == mobile, OTPSession.is_used.is_(False))
        .order_by(OTPSession.created_at.desc())
        .first()
    )
    if not session or session.otp_code != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if session.created_at + timedelta(minutes=settings.OTP_EXPIRY_MINUTES) < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    session.is_used = True
    db.commit()

    user = db.query(User).filter(User.mobile == mobile).first()
    return {
        "message": "Verified",
        "user_id": user.id,
        "name": user.name,
        "preferred_language": user.preferred_language,
    }