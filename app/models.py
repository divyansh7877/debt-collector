from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
)
from sqlalchemy.orm import relationship

from .database import Base


class StatusEnum(str):
    PENDING = "pending"
    ONGOING = "ongoing"
    FINISHED = "finished"
    ARCHIVED = "archived"


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Optional status for group-level tracking
    status = Column(
        String,
        default=StatusEnum.PENDING,
        nullable=False,
    )

    users = relationship("User", back_populates="group")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)

    # Free-form JSON for financial/history details, e.g.
    # {"amount_owed": 500, "due_date": "2025-11-20", "history_text": "..."}
    details = Column(JSON, nullable=False, default=dict)

    status = Column(
        String,
        default=StatusEnum.PENDING,
        nullable=False,
    )

    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

    group = relationship("Group", back_populates="users")
    strategies = relationship("Strategy", back_populates="user")
    documents = relationship("UserDocument", back_populates="user")


class UserDocument(Base):
    __tablename__ = "user_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="documents")


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

    # Stored as JSON; see spec for structure
    timeline = Column(JSON, nullable=False, default=list)

    prompt = Column(String, nullable=True)

    executed = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="strategies")
    group = relationship("Group")

    def owner_type(self) -> str:
        if self.user_id is not None:
            return "user"
        if self.group_id is not None:
            return "group"
        return "unknown"
