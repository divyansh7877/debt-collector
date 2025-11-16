from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional, Tuple

from sqlalchemy.orm import Session

from . import models, schemas


# ---- User CRUD ----


def create_user(db: Session, *, name: str, details: Dict[str, Any]) -> models.User:
    user = models.User(name=name, details=details or {})
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def list_users(
    db: Session,
    *,
    status: Optional[str] = None,
) -> List[models.User]:
    q = db.query(models.User)
    if status:
        q = q.filter(models.User.status == status)
    return q.all()


def update_user_status(db: Session, user: models.User, status: str) -> models.User:
    user.status = status
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def upsert_user_from_details(
    db: Session,
    *,
    user_id: Optional[int],
    name: str,
    details: Dict[str, Any],
) -> models.User:
    if user_id is not None:
        existing = get_user(db, user_id)
        if not existing:
            raise ValueError(f"User with id {user_id} not found")
        existing.name = name
        existing.details = details or {}
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    return create_user(db, name=name, details=details)


# ---- Group CRUD ----


def get_group(db: Session, group_id: int) -> Optional[models.Group]:
    return db.query(models.Group).filter(models.Group.id == group_id).first()


def list_groups(
    db: Session,
    *,
    status: Optional[str] = None,
) -> List[models.Group]:
    q = db.query(models.Group)
    if status:
        q = q.filter(models.Group.status == status)
    return q.all()


def create_group_with_users(
    db: Session,
    *,
    name: str,
    user_ids: List[int],
) -> models.Group:
    group = models.Group(name=name)
    db.add(group)
    db.flush()  # get group.id before assigning users

    users = db.query(models.User).filter(models.User.id.in_(user_ids)).all()
    found_ids = {u.id for u in users}
    missing = set(user_ids) - found_ids
    if missing:
        raise ValueError(f"User IDs not found: {sorted(missing)}")

    for user in users:
        user.group_id = group.id
        db.add(user)

    db.commit()
    db.refresh(group)
    return group


def update_group_status(db: Session, group: models.Group, status: str) -> models.Group:
    group.status = status
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


# ---- Strategy CRUD ----


def _strategy_owner_filter(db: Session, owner_id: int, owner_type: str):
    if owner_type == "group":
        return db.query(models.Strategy).filter(models.Strategy.group_id == owner_id)
    return db.query(models.Strategy).filter(models.Strategy.user_id == owner_id)


def get_latest_strategy_for_owner(
    db: Session,
    *,
    owner_id: int,
    owner_type: str,
) -> Optional[models.Strategy]:
    return (
        _strategy_owner_filter(db, owner_id, owner_type)
        .order_by(models.Strategy.created_at.desc())
        .first()
    )


def create_or_update_strategy_for_owner(
    db: Session,
    *,
    owner_id: int,
    owner_type: str,
    timeline: List[Dict[str, Any]],
    prompt: Optional[str] = None,
) -> models.Strategy:
    existing = get_latest_strategy_for_owner(db, owner_id=owner_id, owner_type=owner_type)

    if existing:
        existing.timeline = timeline
        existing.prompt = prompt
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    strategy = models.Strategy(
        user_id=owner_id if owner_type == "user" else None,
        group_id=owner_id if owner_type == "group" else None,
        timeline=timeline,
        prompt=prompt,
    )
    db.add(strategy)
    db.commit()
    db.refresh(strategy)
    return strategy


def mark_strategy_executed(db: Session, strategy: models.Strategy) -> models.Strategy:
    strategy.executed = True
    db.add(strategy)
    db.commit()
    db.refresh(strategy)
    return strategy


# ---- Analytics helpers ----


def compute_counts_by_status(users: Iterable[models.User]) -> Dict[str, int]:
    counts: Dict[str, int] = {"pending": 0, "ongoing": 0, "finished": 0}
    for u in users:
        if u.status in counts:
            counts[u.status] += 1
    return counts


def _parse_due_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            # Expect ISO-like string: YYYY-MM-DD
            return date.fromisoformat(value[:10])
        except Exception:
            return None
    return None


def compute_avg_overdue_days(users: Iterable[models.User]) -> float:
    today = date.today()
    diffs: List[int] = []

    for u in users:
        details = u.details or {}
        due_raw = details.get("due_date")
        amount_owed = details.get("amount_owed")
        due = _parse_due_date(due_raw)
        if due and amount_owed is not None and amount_owed > 0 and due < today:
            diffs.append((today - due).days)

    if not diffs:
        return 0.0
    return sum(diffs) / len(diffs)


def compute_collections_analytics(users: Iterable[models.User]) -> Dict[str, Any]:
    """Compute collections-related analytics from users."""
    total_amount_owed = 0.0
    total_amount_collected = 0.0
    timeline_data: List[Dict[str, Any]] = []

    for u in users:
        details = u.details or {}
        
        # Amount owed
        amount_owed = details.get("amount_owed", 0)
        if isinstance(amount_owed, (int, float)):
            total_amount_owed += float(amount_owed)
        
        # Amount collected (from payment_history or total_paid)
        total_paid = details.get("total_paid", 0)
        if isinstance(total_paid, (int, float)):
            total_amount_collected += float(total_paid)
        else:
            # Fallback: calculate from payment_history
            payment_history = details.get("payment_history", [])
            if isinstance(payment_history, list):
                paid = sum(p.get("amount", 0) for p in payment_history if isinstance(p, dict))
                total_amount_collected += paid
        
        # Add payment history to timeline
        payment_history = details.get("payment_history", [])
        if isinstance(payment_history, list):
            for payment in payment_history:
                if isinstance(payment, dict) and payment.get("date"):
                    timeline_data.append({
                        "user_id": u.id,
                        "user_name": u.name,
                        "date": payment.get("date"),
                        "amount": payment.get("amount", 0),
                        "installment_number": payment.get("installment_number"),
                    })
    
    # Sort timeline by date
    timeline_data.sort(key=lambda x: x.get("date", ""))
    
    total_remaining = max(0.0, total_amount_owed - total_amount_collected)
    
    return {
        "total_amount_owed": total_amount_owed,
        "total_amount_collected": total_amount_collected,
        "total_remaining": total_remaining,
        "timeline_data": timeline_data,
    }
