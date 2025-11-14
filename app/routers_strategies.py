from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import get_db

router = APIRouter(prefix="/strategies", tags=["strategies"])


def _get_owner(db: Session, owner_id: int, owner_type: str) -> models.User | models.Group:
    if owner_type == "group":
        obj = crud.get_group(db, owner_id)
        if not obj:
            raise HTTPException(status_code=404, detail="Group not found")
        return obj
    obj = crud.get_user(db, owner_id)
    if not obj:
        raise HTTPException(status_code=404, detail="User not found")
    return obj


def _build_default_timeline(details: Dict[str, Any], prompt: str) -> List[Dict[str, Any]]:
    """Fallback deterministic strategy timeline used when AI is not available.

    This keeps the prototype functional without external API keys.
    """
    amount_owed = details.get("amount_owed")
    tone_first = "friendly"
    tone_second = "firm"
    tone_third = "escalation"

    return [
        {
            "timing": "Day 1-7",
            "blocks": [
                {
                    "source": "email",
                    "tone": tone_first,
                    "content": "Gentle reminder about your outstanding balance.",
                }
            ],
        },
        {
            "timing": "Day 8-14",
            "blocks": [
                {
                    "source": "sms",
                    "tone": tone_second,
                    "content": "Follow-up on payment; please contact us to arrange a plan.",
                }
            ],
        },
        {
            "timing": "Day 15-30",
            "blocks": [
                {
                    "source": "call",
                    "tone": tone_third,
                    "content": "Final reminder; account may be escalated if unpaid.",
                }
            ],
        },
    ]


async def _generate_timeline_with_ai(
    details: Dict[str, Any],
    prompt: str,
) -> List[Dict[str, Any]]:
    """Call xAI Grok (or similar) to generate a strategy.

    For now this is written as a placeholder. If `XAI_API_KEY` is not present,
    it falls back to a deterministic local strategy.
    """
    api_key = os.getenv("XAI_API_KEY")

    if not api_key:
        return _build_default_timeline(details, prompt)

    # NOTE: The actual endpoint and payload depend on xAI's API.
    # Adjust this function to match the real Grok API.
    base_url = os.getenv("XAI_API_BASE_URL", "https://api.x.ai")
    url = f"{base_url}/v1/chat/completions"

    system_prompt = (
        "You are a collections strategy planner. "
        "Given user or group details, output ONLY JSON with a 'timeline' key, "
        "where 'timeline' is a list of columns with 'timing' and 'blocks'. "
        "Each block has 'source', 'tone', and 'content'."
    )

    payload = {
        "model": os.getenv("XAI_MODEL", "grok-beta"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"Details: {details}. Prompt: {prompt}. Output JSON only.",
            },
        ],
        "temperature": 0.3,
    }

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        # On any error, fall back to deterministic plan
        return _build_default_timeline(details, prompt)

    # Very defensive parsing; adapt to xAI's actual response schema.
    try:
        # Assume OpenAI-like schema
        content = data["choices"][0]["message"]["content"]
    except Exception:
        return _build_default_timeline(details, prompt)

    import json

    try:
        parsed = json.loads(content)
        timeline = parsed.get("timeline")
        if isinstance(timeline, list):
            return timeline
    except Exception:
        pass

    return _build_default_timeline(details, prompt)


@router.get("/{owner_id}", response_model=Optional[schemas.StrategyRead])
async def get_strategy(
    owner_id: int,
    owner_type: schemas.OwnerTypeLiteral = Query("user"),
    db: Session = Depends(get_db),
):
    strategy = crud.get_latest_strategy_for_owner(db, owner_id=owner_id, owner_type=owner_type)
    if not strategy:
        return None
    return schemas.StrategyRead(
        id=strategy.id,
        timeline=strategy.timeline,
        prompt=strategy.prompt,
        executed=strategy.executed,
        owner_type=owner_type,
    )


@router.post("/{owner_id}", response_model=schemas.StrategyRead)
async def create_or_update_strategy(
    owner_id: int,
    body: schemas.StrategyCreate,
    db: Session = Depends(get_db),
):
    # Ensure owner exists
    _ = _get_owner(db, owner_id, body.owner_type)

    strategy = crud.create_or_update_strategy_for_owner(
        db,
        owner_id=owner_id,
        owner_type=body.owner_type,
        timeline=[col.dict() for col in body.timeline],
        prompt=body.prompt,
    )

    return schemas.StrategyRead(
        id=strategy.id,
        timeline=strategy.timeline,
        prompt=strategy.prompt,
        executed=strategy.executed,
        owner_type=body.owner_type,
    )


@router.post("/{owner_id}/ai-generate", response_model=schemas.StrategyRead)
async def ai_generate_strategy(
    owner_id: int,
    body: schemas.AIGenerateRequest,
    owner_type: schemas.OwnerTypeLiteral = Query("user"),
    db: Session = Depends(get_db),
):
    owner = _get_owner(db, owner_id, owner_type)

    details: Dict[str, Any]
    if isinstance(owner, models.User):
        details = owner.details or {}
        name = owner.name
    else:
        # For groups, aggregate basic info
        details = {"group_name": owner.name, "members": len(owner.users)}
        name = owner.name

    prompt = body.prompt or "Create balanced collection strategy"

    timeline = await _generate_timeline_with_ai(details, prompt)

    strategy = crud.create_or_update_strategy_for_owner(
        db,
        owner_id=owner_id,
        owner_type=owner_type,
        timeline=timeline,
        prompt=prompt,
    )

    return schemas.StrategyRead(
        id=strategy.id,
        timeline=strategy.timeline,
        prompt=strategy.prompt,
        executed=strategy.executed,
        owner_type=owner_type,
    )


@router.post("/{owner_id}/execute", response_model=schemas.StrategyExecuteResponse)
async def execute_strategy(
    owner_id: int,
    owner_type: schemas.OwnerTypeLiteral = Query("user"),
    db: Session = Depends(get_db),
):
    owner = _get_owner(db, owner_id, owner_type)

    strategy = crud.get_latest_strategy_for_owner(db, owner_id=owner_id, owner_type=owner_type)
    if not strategy:
        raise HTTPException(status_code=404, detail="No strategy found for this owner")

    strategy = crud.mark_strategy_executed(db, strategy)

    # Prototype: simulate side effects by updating status based on amount owed.
    user_status: Optional[str] = None
    group_status: Optional[str] = None

    if isinstance(owner, models.User):
        details = owner.details or {}
        amount_owed = details.get("amount_owed")
        if amount_owed is not None and amount_owed > 0:
            owner = crud.update_user_status(db, owner, status="ongoing")
        else:
            owner = crud.update_user_status(db, owner, status="finished")
        user_status = owner.status

    else:  # Group
        # Very simple: if any member owes > 0, group is ongoing; else finished
        members = owner.users
        any_owed = False
        for u in members:
            details = u.details or {}
            if (details.get("amount_owed") or 0) > 0:
                any_owed = True
                break
        if any_owed:
            owner = crud.update_group_status(db, owner, status="ongoing")
        else:
            owner = crud.update_group_status(db, owner, status="finished")
        group_status = owner.status

    return schemas.StrategyExecuteResponse(
        id=strategy.id,
        executed=strategy.executed,
        user_status=user_status,
        group_status=group_status,
    )
