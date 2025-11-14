from __future__ import annotations

from io import BytesIO
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from . import crud, schemas
from .database import get_db

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


def _extract_user_from_excel(file_bytes: bytes) -> tuple[str, dict]:
    try:
        df = pd.read_excel(BytesIO(file_bytes))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read Excel file: {exc}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Excel file is empty")

    # Assume first row contains the user we care about
    row = df.iloc[0].to_dict()
    name = row.get("name") or row.get("Name")
    if not isinstance(name, str) or not name.strip():
        raise HTTPException(status_code=400, detail="Excel must contain a 'name' column")

    details = {k: v for k, v in row.items() if k not in {"name", "Name"}}
    return name.strip(), details


def _extract_history_from_pdf(file_bytes: bytes) -> str:
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        raise HTTPException(status_code=500, detail="PyPDF2 is required for PDF handling")

    try:
        reader = PdfReader(BytesIO(file_bytes))
        texts = []
        for page in reader.pages:
            text = page.extract_text() or ""
            texts.append(text)
        return "\n".join(texts).strip()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF file: {exc}")


@router.post("/upload", response_model=schemas.IngestionUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Upload an Excel or PDF file and create/update a User.

    - Excel: expects a 'name' column + any other detail columns.
    - PDF: extracts raw text into details["history_text"], requires user_id or name in filename.
    """

    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    filename_lower = (file.filename or "").lower()

    # Excel handling
    if filename_lower.endswith((".xlsx", ".xls")):
        name, details = _extract_user_from_excel(content)
        user = crud.upsert_user_from_details(db, user_id=user_id, name=name, details=details)
        return schemas.IngestionUploadResponse(user_id=user.id)

    # PDF handling
    if filename_lower.endswith(".pdf"):
        history_text = _extract_history_from_pdf(content)

        if user_id is not None:
            user = crud.get_user(db, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found for provided user_id")
            current_details = user.details or {}
            current_details["history_text"] = history_text
            user = crud.upsert_user_from_details(
                db,
                user_id=user_id,
                name=user.name,
                details=current_details,
            )
            return schemas.IngestionUploadResponse(user_id=user.id)

        # If no user_id is given, create a new one with a generic name from filename
        base_name = (file.filename or "user").rsplit(".", 1)[0]
        name = base_name or "user-from-pdf"
        details = {"history_text": history_text}
        user = crud.create_user(db, name=name, details=details)
        return schemas.IngestionUploadResponse(user_id=user.id)

    raise HTTPException(status_code=400, detail="Unsupported file type. Use .xlsx, .xls or .pdf")


@router.post("/add-user", response_model=schemas.UserRead)
def add_user_manual(
    body: schemas.ManualUserCreate,
    db: Session = Depends(get_db),
):
    user = crud.create_user(db, name=body.name, details=body.details)
    return user
