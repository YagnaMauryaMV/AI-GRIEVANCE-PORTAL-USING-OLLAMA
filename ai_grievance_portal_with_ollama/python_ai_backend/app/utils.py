from sqlalchemy.orm import Session
from .models import SLARule

DEFAULT_SLA_MAP = {
    ("*", "normal"): 30,
    ("*", "high"): 7,
    ("*", "critical"): 2,
}


def get_sla_days(db: Session, category: str, severity_level: str) -> int:
    severity = (severity_level or "").lower() or "normal"
    rule = (
        db.query(SLARule)
        .filter(SLARule.category == category, SLARule.severity_level == severity)
        .first()
    )
    if rule:
        return rule.days
    return DEFAULT_SLA_MAP.get(("*", severity), 30)
