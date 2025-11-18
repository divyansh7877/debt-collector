from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, ConfigDict


StatusLiteral = Literal["pending", "ongoing", "finished"]
OwnerTypeLiteral = Literal["user", "group"]
BlockTypeLiteral = Literal["action", "decision"]


# ---- User & Group Schemas ----


class UserBase(BaseModel):
    name: str
    details: Dict[str, Any] = Field(default_factory=dict)
    status: StatusLiteral = "pending"
    group_id: Optional[int] = None


class UserCreate(BaseModel):
    name: str
    details: Dict[str, Any] = Field(default_factory=dict)


class UserUpdateStatus(BaseModel):
    status: StatusLiteral


class UserDocumentRead(BaseModel):
    id: int
    filename: str
    file_type: Optional[str] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRead(UserBase):
    id: int
    documents: List[UserDocumentRead] = []

    # Support both Pydantic v1 and v2
    model_config = ConfigDict(from_attributes=True)


class GroupBase(BaseModel):
    name: str
    status: StatusLiteral = "pending"


class GroupCreate(BaseModel):
    name: str
    user_ids: List[int] = Field(default_factory=list)


class GroupUpdateStatus(BaseModel):
    status: StatusLiteral


class GroupRead(GroupBase):
    id: int

    # Support both Pydantic v1 and v2
    model_config = ConfigDict(from_attributes=True)


# ---- Strategy Schemas ----


class ContactMethodDetail(BaseModel):
    """Details for a specific contact method."""
    method: str  # "email", "phone", "sms"
    value: str  # actual email/phone number
    label: Optional[str] = None  # "Primary Phone", "Work Email", etc.
    is_preferred: bool = False


class DecisionOutput(BaseModel):
    """Defines a possible output path from a decision block."""
    condition: str  # Description of when this output is chosen
    next_timing: Optional[str] = None  # Which timeline column to jump to
    action: Optional[str] = None  # What action to take


class StrategyBlock(BaseModel):
    """Base strategy block - can be action or decision type."""
    block_type: BlockTypeLiteral = "action"  # "action" or "decision"
    
    # Action block fields
    source: Optional[str] = None  # "email", "sms", "call"
    tone: Optional[str] = None  # "friendly", "neutral", "firm", "escalation"
    content: Optional[str] = None  # Message content
    
    # Enhanced execution details for action blocks
    contact_method_detail: Optional[str] = None  # Which specific contact to use
    preferred_contact: Optional[str] = None  # User's preferred method
    
    # Decision block fields
    decision_prompt: Optional[str] = None  # AI prompt for decision logic
    decision_sources: Optional[List[str]] = None  # Data sources to consider
    decision_outputs: Optional[List[DecisionOutput]] = None  # Possible outcomes


class StrategyTimelineColumn(BaseModel):
    timing: str
    blocks: List[StrategyBlock]


class StrategyBase(BaseModel):
    timeline: List[StrategyTimelineColumn]
    prompt: Optional[str] = None
    owner_type: OwnerTypeLiteral = "user"


class StrategyCreate(StrategyBase):
    pass


class StrategyRead(StrategyBase):
    id: int
    executed: bool

    # Support both Pydantic v1 and v2
    model_config = ConfigDict(from_attributes=True)


class StrategyExecuteResponse(BaseModel):
    id: int
    executed: bool
    user_status: Optional[StatusLiteral] = None
    group_status: Optional[StatusLiteral] = None


class AIGenerateRequest(BaseModel):
    prompt: Optional[str] = None


class BlockContentAIGenerateRequest(BaseModel):
    """Request body for generating AI content for a single action block."""

    block: StrategyBlock
    prompt: Optional[str] = None


class BlockContentAIResponse(BaseModel):
    """Response body containing AI‑generated content for an action block."""

    content: str


# ---- Ingestion Schemas ----


class ManualUserCreate(BaseModel):
    name: str
    details: Dict[str, Any] = Field(default_factory=dict)


class IngestionUploadResponse(BaseModel):
    user_id: int


# ---- Listing & Analytics Schemas ----


class EntitySummary(BaseModel):
    id: int
    name: str
    type: OwnerTypeLiteral  # "user" or "group"
    status: StatusLiteral
    summary_details: Dict[str, Any] = Field(default_factory=dict)


class AnalyticsResponse(BaseModel):
    counts_by_status: Dict[StatusLiteral, int]
    avg_overdue_days: float
    total_users: int
    total_amount_owed: float = 0.0
    total_amount_collected: float = 0.0
    total_remaining: float = 0.0
    timeline_data: List[Dict[str, Any]] = Field(default_factory=list)  # Payment timeline
