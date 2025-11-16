from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[schemas.EntitySummary])
def list_entities(
    status: Optional[schemas.StatusLiteral] = Query(None),
    db: Session = Depends(get_db),
):
    """List all users and groups with statuses.

    If `status` is provided, filter by that status.
    """
    users = crud.list_users(db, status=status)
    groups = crud.list_groups(db, status=status)

    results: List[schemas.EntitySummary] = []

    for u in users:
        # Keep only a lightweight summary of details
        details = u.details or {}
        summary = {k: v for k, v in details.items() if k in {"amount_owed", "due_date"}}
        results.append(
            schemas.EntitySummary(
                id=u.id,
                name=u.name,
                type="user",
                status=u.status,
                summary_details=summary,
            )
        )

    for g in groups:
        results.append(
            schemas.EntitySummary(
                id=g.id,
                name=g.name,
                type="group",
                status=g.status,
                summary_details={"members": len(g.users)},
            )
        )

    return results


@router.get("/analytics", response_model=schemas.AnalyticsResponse)
def analytics(db: Session = Depends(get_db)):
    """Get analytics data for all users."""
    users = crud.list_users(db)
    counts = crud.compute_counts_by_status(users)
    avg_overdue = crud.compute_avg_overdue_days(users)
    return schemas.AnalyticsResponse(
        counts_by_status=counts,
        avg_overdue_days=avg_overdue,
        total_users=len(users),
    )


@router.post("/group", response_model=schemas.GroupRead)
def create_group(
    body: schemas.GroupCreate,
    db: Session = Depends(get_db),
):
    try:
        group = crud.create_group_with_users(db, name=body.name, user_ids=body.user_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return group


@router.get("/{id}")
def get_entity(
    id: int,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Get user or group details by id.

    Tries user first, then group. Returns a generic payload with `type`.
    """
    user = crud.get_user(db, id)
    if user:
        return {
            "type": "user",
            "data": schemas.UserRead.from_orm(user),
            "group": schemas.GroupRead.from_orm(user.group) if user.group else None,
        }

    group = crud.get_group(db, id)
    if group:
        return {
            "type": "group",
            "data": schemas.GroupRead.from_orm(group),
            "members": [schemas.UserRead.from_orm(u) for u in group.users],
        }

    raise HTTPException(status_code=404, detail="User or group not found")


@router.patch("/{id}/status")
def update_status(
    id: int,
    body: schemas.UserUpdateStatus,
    db: Session = Depends(get_db),
):
    """Update status of a user or group.

    Tries user first, then group.
    """
    user = crud.get_user(db, id)
    if user:
        updated = crud.update_user_status(db, user, status=body.status)
        return {"type": "user", "data": schemas.UserRead.from_orm(updated)}

    group = crud.get_group(db, id)
    if group:
        updated = crud.update_group_status(db, group, status=body.status)
        return {"type": "group", "data": schemas.GroupRead.from_orm(updated)}

    raise HTTPException(status_code=404, detail="User or group not found")
