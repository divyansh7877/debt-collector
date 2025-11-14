from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


StatusLiteral = Literal["pending", "ongoing", "finished"]
OwnerTypeLiteral = Literal["user", "group"]


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


class UserRead(UserBase):
    id: int

    class Config:
        orm_mode = True


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

    class Config:
        orm_mode = True


# ---- Strategy Schemas ----


class StrategyBlock(BaseModel):
    source: str
    tone: str
    content: str


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

    class Config:
        orm_mode = True


class StrategyExecuteResponse(BaseModel):
    id: int
    executed: bool
    user_status: Optional[StatusLiteral] = None
    group_status: Optional[StatusLiteral] = None


class AIGenerateRequest(BaseModel):
    prompt: Optional[str] = None


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
