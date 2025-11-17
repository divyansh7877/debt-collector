from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import ValidationError
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


def _get_contact_value(contact_methods: List[Dict[str, Any]], method_candidates: List[str]) -> Optional[str]:
    """Return the preferred contact detail matching the provided method candidates."""
    if not contact_methods:
        return None
    normalized = [m.lower() for m in method_candidates]
    preferred = next(
        (
            cm
            for cm in contact_methods
            if cm.get("method", "").lower() in normalized and cm.get("is_preferred")
        ),
        None,
    )
    if preferred:
        return preferred.get("value")

    fallback = next(
        (cm for cm in contact_methods if cm.get("method", "").lower() in normalized),
        None,
    )
    if fallback:
        return fallback.get("value")
    return None


def _apply_block_defaults(
    block: Dict[str, Any],
    contact_methods: List[Dict[str, Any]],
    preferred_contact: Optional[str],
) -> Dict[str, Any]:
    normalized = dict(block or {})
    normalized["block_type"] = normalized.get("block_type") or "action"

    if normalized["block_type"] == "decision":
        normalized.setdefault("decision_sources", [])
        normalized.setdefault("decision_outputs", [])
        return normalized

    source = (normalized.get("source") or "").lower()
    contact_value: Optional[str] = None
    if source == "email":
        contact_value = _get_contact_value(contact_methods, ["email"])
    elif source in {"call", "phone"}:
        contact_value = _get_contact_value(contact_methods, ["phone"])
    elif source == "sms":
        contact_value = _get_contact_value(contact_methods, ["sms", "phone"])

    if contact_value and not normalized.get("contact_method_detail"):
        normalized["contact_method_detail"] = contact_value

    if preferred_contact and not normalized.get("preferred_contact"):
        normalized["preferred_contact"] = preferred_contact

    return normalized


def _apply_contact_metadata(timeline: List[Dict[str, Any]], details: Dict[str, Any]) -> List[Dict[str, Any]]:
    contact_methods = details.get("contact_methods") or []
    preferred_contact = details.get("preferred_contact")
    enriched: List[Dict[str, Any]] = []
    for column in timeline or []:
        enriched.append(
            {
                "timing": column.get("timing") or "Unscheduled",
                "blocks": [
                    _apply_block_defaults(block, contact_methods, preferred_contact)
                    for block in column.get("blocks", [])
                ],
            }
        )
    return enriched


def _validate_timeline_schema(timeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    try:
        columns = [schemas.StrategyTimelineColumn(**column) for column in timeline]
    except ValidationError as exc:
        raise HTTPException(
            status_code=400,
            detail={"error": "Invalid strategy timeline", "details": exc.errors()},
        )
    return [column.dict() for column in columns]


def _prepare_timeline(timeline: List[Dict[str, Any]], details: Dict[str, Any]) -> List[Dict[str, Any]]:
    enriched = _apply_contact_metadata(timeline, details)
    return _validate_timeline_schema(enriched)


def _build_default_timeline(details: Dict[str, Any], prompt: str) -> List[Dict[str, Any]]:
    """Fallback deterministic strategy timeline used when AI is not available."""
    amount_owed = details.get("amount_owed")
    amount_phrase = (
        f"₹{amount_owed:,}" if isinstance(amount_owed, (int, float)) else "your outstanding balance"
    )

    base_timeline = [
        {
            "timing": "Day 1-7",
            "blocks": [
                {
                    "block_type": "action",
                    "source": "email",
                    "tone": "friendly",
                    "content": f"Gentle reminder about {amount_phrase}.",
                }
            ],
        },
        {
            "timing": "Day 8-14",
            "blocks": [
                {
                    "block_type": "action",
                    "source": "sms",
                    "tone": "neutral",
                    "content": "Follow-up on payment; please contact us to arrange a plan.",
                }
            ],
        },
        {
            "timing": "Day 15-30",
            "blocks": [
                {
                    "block_type": "action",
                    "source": "email",
                    "tone": "firm",
                    "content": "Important: Payment is now overdue. Please settle your account.",
                },
                {
                    "block_type": "decision",
                    "decision_prompt": "Check if user has made any partial payment or contacted us",
                    "decision_sources": ["payment_history", "communication_log"],
                    "decision_outputs": [
                        {
                            "condition": "If partial payment received",
                            "next_timing": "Day 31-50",
                            "action": "Send thank you and payment plan",
                        },
                        {
                            "condition": "If no response",
                            "next_timing": "Day 31-50",
                            "action": "Escalate to phone call",
                        },
                    ],
                },
            ],
        },
        {
            "timing": "Day 31-50",
            "blocks": [
                {
                    "block_type": "action",
                    "source": "call",
                    "tone": "firm",
                    "content": "Direct call to discuss payment options and resolve outstanding balance.",
                }
            ],
        },
        {
            "timing": "Day 51-90",
            "blocks": [
                {
                    "block_type": "action",
                    "source": "email",
                    "tone": "escalation",
                    "content": "Final notice: Account will be escalated to collections if not resolved.",
                }
            ],
        },
        {
            "timing": "Day 90+",
            "blocks": [
                {
                    "block_type": "action",
                    "source": "call",
                    "tone": "escalation",
                    "content": "Legal action may be pursued. Immediate payment required.",
                }
            ],
        },
    ]

    return _prepare_timeline(base_timeline, details)


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
            try:
                return _prepare_timeline(timeline, details)
            except HTTPException:
                # Invalid structure from AI; fall back
                return _build_default_timeline(details, prompt)
    except Exception:
        return _build_default_timeline(details, prompt)

    return _build_default_timeline(details, prompt)


def _build_default_action_content(
    details: Dict[str, Any],
    block: Dict[str, Any],
    user_prompt: Optional[str],
) -> str:
    """Deterministic fallback content for an action block when AI is unavailable.

    Uses basic heuristics based on amount owed, due date, and tone.
    """
    amount_owed = details.get("amount_owed")
    amount_phrase = (
        f"₹{amount_owed:,}" if isinstance(amount_owed, (int, float)) else "your outstanding balance"
    )
    tone = (block.get("tone") or "friendly").lower()
    source = (block.get("source") or "email").lower()

    # Basic tone-specific phrasing
    if tone == "escalation":
        prefix = "This is an important notice regarding"
        call_to_action = "Immediate attention is required to avoid further action."
    elif tone == "firm":
        prefix = "This is a reminder regarding"
        call_to_action = "Please make the payment or contact us to discuss options."
    elif tone == "neutral":
        prefix = "We are writing about"
        call_to_action = "Please review your account and complete the payment at your earliest convenience."
    else:  # friendly / default
        prefix = "Just a gentle reminder about"
        call_to_action = "If you have already paid, please ignore this message."

    channel_phrase = "this email"
    if source == "sms":
        channel_phrase = "this message"
    elif source in {"call", "phone"}:
        channel_phrase = "this call"

    extra = ""
    if user_prompt:
        extra = f" {user_prompt.strip()}"

    return (
        f"{prefix} {amount_phrase}. "
        f"{call_to_action}{extra}".strip()
    )


async def _generate_action_content_with_ai(
    details: Dict[str, Any],
    block: Dict[str, Any],
    user_prompt: Optional[str],
) -> str:
    """Generate AI content for a single action block using OpenAI (small model).

    Falls back to a deterministic template if `OPENAI_API_KEY` is not configured
    or if the API call fails.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _build_default_action_content(details, block, user_prompt)

    # Prepare context
    amount_owed = details.get("amount_owed")
    due_date = details.get("due_date")
    preferred_contact = details.get("preferred_contact")
    customer_name = details.get("name") or details.get("customer_name")

    source = (block.get("source") or "email").lower()
    tone = (block.get("tone") or "friendly").lower()

    # Default to a concise planner prompt if none is provided
    planner_prompt = user_prompt or "Write a concise, clear collection reminder."

    system_prompt = (
        "You are a collections communication assistant. "
        "You write short, clear, and respectful messages for collections teams. "
        "Use the requested tone but remain professional and compliant. "
        "Return ONLY the message body, without explanations or surrounding quotes."
    )

    user_parts = [
        f"Channel: {source}",
        f"Tone: {tone}",
    ]
    if customer_name:
        user_parts.append(f"Customer name: {customer_name}")
    if amount_owed is not None:
        user_parts.append(f"Outstanding amount: {amount_owed}")
    if due_date:
        user_parts.append(f"Due date: {due_date}")
    if preferred_contact:
        user_parts.append(f"Preferred contact method: {preferred_contact}")

    context_str = "; ".join(user_parts)
    full_user_content = (
        f"{planner_prompt}\n\n"
        f"Context: {context_str}\n\n"
        "Write the message as it should be sent to the customer."
    )

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    base_url = os.getenv("OPENAI_API_BASE_URL", "https://api.openai.com/v1")
    url = f"{base_url.rstrip('/')}/chat/completions"

    payload: Dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": full_user_content},
        ],
        "temperature": 0.4,
        "max_tokens": 300,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return (content or "").strip()
    except Exception:
        # On any error, fall back to deterministic content
        return _build_default_action_content(details, block, user_prompt)


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
    body: schemas.AIGenerateRequest = Body(default_factory=schemas.AIGenerateRequest),
    owner_type: schemas.OwnerTypeLiteral = Query("user"),
    db: Session = Depends(get_db),
):
    owner = _get_owner(db, owner_id, owner_type)

    details: Dict[str, Any]
    if isinstance(owner, models.User):
        details = owner.details or {}
    else:
        # For groups, aggregate basic info
        details = {"group_name": owner.name, "members": len(owner.users)}

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


@router.post(
    "/{owner_id}/ai-generate-block-content",
    response_model=schemas.BlockContentAIResponse,
)
async def ai_generate_block_content(
    owner_id: int,
    body: schemas.BlockContentAIGenerateRequest,
    owner_type: schemas.OwnerTypeLiteral = Query("user"),
    db: Session = Depends(get_db),
):
    """Generate AI content for a single action block.

    Uses user or group details (e.g. outstanding amount, preferred contact) together
    with the block configuration and an optional planner prompt to craft a
    suitable message via OpenAI (or a deterministic fallback).
    """
    owner = _get_owner(db, owner_id, owner_type)

    if isinstance(owner, models.User):
        details: Dict[str, Any] = owner.details or {}
    else:
        # For groups, aggregate basic info
        details = {"group_name": owner.name, "members": len(owner.users)}

    # Convert Pydantic model to a plain dict for easier manipulation
    block_dict = body.block.dict()

    content = await _generate_action_content_with_ai(details, block_dict, body.prompt)
    return schemas.BlockContentAIResponse(content=content)


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
