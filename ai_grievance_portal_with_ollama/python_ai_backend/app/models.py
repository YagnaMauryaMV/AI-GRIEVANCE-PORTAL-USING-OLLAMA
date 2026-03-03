from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    mobile = Column(String(15), unique=True, index=True)
    preferred_language = Column(String(10), default="en")

    tickets = relationship("Ticket", back_populates="user")


class OTPSession(Base):
    __tablename__ = "otp_sessions"

    id = Column(Integer, primary_key=True, index=True)
    mobile = Column(String(15), index=True)
    otp_code = Column(String(6))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_used = Column(Boolean, default=False)


class Officer(Base):
    __tablename__ = "officers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    department = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    password_hash = Column(String(255))

    tickets = relationship("Ticket", back_populates="officer")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String(100))
    subcategory = Column(String(100), nullable=True)
    description = Column(Text)
    sentiment = Column(String(20))
    severity_level = Column(String(20))
    status = Column(
        String(40),
        default="OPEN",
        # OPEN / IN_PROGRESS / RESOLVED_PENDING_CONFIRMATION /
        # CLOSED / REOPENED / OVERDUE
    )
    department = Column(String(100))
    officer_id = Column(Integer, ForeignKey("officers.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sla_due_at = Column(DateTime(timezone=True))
    last_updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", back_populates="tickets")
    officer = relationship("Officer", back_populates="tickets")
    evidences = relationship("Evidence", back_populates="ticket")
    call_logs = relationship("CallLog", back_populates="ticket")


class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    officer_id = Column(Integer, ForeignKey("officers.id"))
    note = Column(Text)
    file_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("Ticket", back_populates="evidences")
    officer = relationship("Officer")


class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    officer_id = Column(Integer, ForeignKey("officers.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    contacted_at = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(Text, nullable=True)

    ticket = relationship("Ticket", back_populates="call_logs")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    password_hash = Column(String(255))


class SLARule(Base):
    __tablename__ = "sla_rules"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100))          # e.g. "Water & Sanitation"
    severity_level = Column(String(20))     # normal / high / critical
    days = Column(Integer)                  # SLA days
