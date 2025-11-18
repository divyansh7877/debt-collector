from __future__ import annotations

from typing import Any, Dict, List, Optional
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.orm import Session, joinedload

from . import crud, models, schemas
from .database import get_db

router = APIRouter(prefix="/users", tags=["users"])


def _pydantic_to_dict(obj):
    """Convert Pydantic model to dict, handling both v1 and v2."""
    if obj is None:
        return None
    if hasattr(obj, 'dict'):
        return obj.dict()
    if hasattr(obj, 'model_dump'):
        return obj.model_dump()
    return dict(obj)


def _pydantic_from_orm(schema_class, orm_obj):
    """Convert ORM object to Pydantic model, handling both v1 and v2."""
    if orm_obj is None:
        return None
    # Try Pydantic v2 first (model_validate)
    if hasattr(schema_class, 'model_validate'):
        try:
            return schema_class.model_validate(orm_obj)
        except Exception:
            # Fall back to from_orm if model_validate fails
            pass
    # Fall back to Pydantic v1 (from_orm)
    if hasattr(schema_class, 'from_orm'):
        return schema_class.from_orm(orm_obj)
    # Last resort: manual conversion
    try:
        # Try to get field names from Pydantic v2
        if hasattr(schema_class, 'model_fields'):
            field_names = schema_class.model_fields.keys()
        # Or from Pydantic v1
        elif hasattr(schema_class, '__fields__'):
            field_names = schema_class.__fields__.keys()
        else:
            # Guess from ORM object attributes
            field_names = [k for k in dir(orm_obj) if not k.startswith('_')]
        return schema_class(**{k: getattr(orm_obj, k, None) for k in field_names if hasattr(orm_obj, k)})
    except Exception as e:
        raise ValueError(f"Failed to convert ORM object to {schema_class.__name__}: {str(e)}")


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
    collections = crud.compute_collections_analytics(users)
    
    return schemas.AnalyticsResponse(
        counts_by_status=counts,
        avg_overdue_days=avg_overdue,
        total_users=len(users),
        total_amount_owed=collections["total_amount_owed"],
        total_amount_collected=collections["total_amount_collected"],
        total_remaining=collections["total_remaining"],
        timeline_data=collections["timeline_data"],
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
    # Load user with group relationship
    user = db.query(models.User).options(joinedload(models.User.group)).filter(models.User.id == id).first()
    if user:
        try:
            user_read = _pydantic_from_orm(schemas.UserRead, user)
            group_read = _pydantic_from_orm(schemas.GroupRead, user.group) if user.group else None
            return {
                "type": "user",
                "data": _pydantic_to_dict(user_read),
                "group": _pydantic_to_dict(group_read),
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error serializing user: {str(e)}")

    # Load group with users relationship
    group = db.query(models.Group).options(joinedload(models.Group.users)).filter(models.Group.id == id).first()
    if group:
        try:
            group_read = _pydantic_from_orm(schemas.GroupRead, group)
            members_read = [_pydantic_from_orm(schemas.UserRead, u) for u in group.users]
            return {
                "type": "group",
                "data": _pydantic_to_dict(group_read),
                "members": [_pydantic_to_dict(m) for m in members_read],
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error serializing group: {str(e)}")

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
        updated_read = _pydantic_from_orm(schemas.UserRead, updated)
        return {"type": "user", "data": _pydantic_to_dict(updated_read)}

    group = crud.get_group(db, id)
    if group:
        updated = crud.update_group_status(db, group, status=body.status)
        updated_read = _pydantic_from_orm(schemas.GroupRead, updated)
        return {"type": "group", "data": _pydantic_to_dict(updated_read)}

    raise HTTPException(status_code=404, detail="User or group not found")


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/{id}/documents", response_model=schemas.UserDocumentRead)
def upload_user_document(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = crud.get_user(db, id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Sanitize filename to prevent directory traversal
    safe_filename = os.path.basename(file.filename)
    file_path = UPLOAD_DIR / f"{id}_{safe_filename}"
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc = crud.create_user_document(
        db,
        user_id=id,
        filename=safe_filename,
        file_path=str(file_path),
        file_type=file.content_type,
    )
    return doc


@router.post("/{id}/payments", response_model=schemas.UserRead)
def add_payment(
    id: int,
    payment: schemas.PaymentCreate,
    db: Session = Depends(get_db),
):
    try:
        user = crud.add_user_payment(db, user_id=id, payment=payment)
        return _pydantic_from_orm(schemas.UserRead, user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding payment: {str(e)}")
