from __future__ import annotations

from datetime import datetime
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


def _parse_date(date_str: str) -> Optional[str]:
    """Parse various date formats and return ISO format string (YYYY-MM-DD)."""
    if pd.isna(date_str) or not date_str:
        return None
    
    # Try pandas parsing first (handles many formats)
    try:
        parsed = pd.to_datetime(date_str)
        return parsed.strftime("%Y-%m-%d")
    except Exception:
        pass
    
    # Try common formats manually
    formats = ["%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d", "%m-%d-%Y", "%d-%m-%Y"]
    for fmt in formats:
        try:
            parsed = datetime.strptime(str(date_str).strip(), fmt)
            return parsed.strftime("%Y-%m-%d")
        except Exception:
            continue
    
    return None


def _extract_users_from_csv(file_bytes: bytes) -> list[tuple[str, dict]]:
    """Extract user data from CSV file.
    
    Expected CSV format:
    Username,Service,Bill,DueDate,Installment1,Installment1Date,Installment2,Installment2Date,...
    """
    try:
        df = pd.read_csv(BytesIO(file_bytes))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV file: {exc}")

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    users = []
    
    # Normalize column names (case-insensitive, strip whitespace)
    df.columns = df.columns.str.strip()
    column_map = {col.lower(): col for col in df.columns}
    
    # Required columns
    username_col = column_map.get("username")
    if not username_col:
        raise HTTPException(status_code=400, detail="CSV must contain a 'Username' column")

    for _, row in df.iterrows():
        # Extract basic info
        username = str(row[username_col]).strip()
        if not username or username.lower() == "nan":
            continue
        
        details = {}
        
        # Service
        service_col = column_map.get("service")
        if service_col and pd.notna(row.get(service_col)):
            details["service"] = str(row[service_col]).strip()
        
        # Bill amount
        bill_col = column_map.get("bill")
        if bill_col and pd.notna(row.get(bill_col)):
            try:
                details["amount_owed"] = float(row[bill_col])
            except (ValueError, TypeError):
                pass
        
        # Due date
        due_date_col = column_map.get("duedate")
        if due_date_col and pd.notna(row.get(due_date_col)):
            parsed_date = _parse_date(row[due_date_col])
            if parsed_date:
                details["due_date"] = parsed_date
        
        # Payment history (installments)
        payment_history = []
        for i in range(1, 5):  # Installment1-4
            amount_col = column_map.get(f"installment{i}")
            date_col = column_map.get(f"installment{i}date")
            
            if amount_col and date_col:
                amount_val = row.get(amount_col)
                date_val = row.get(date_col)
                
                if pd.notna(amount_val) and pd.notna(date_val):
                    try:
                        amount = float(amount_val)
                        parsed_date = _parse_date(date_val)
                        if parsed_date and amount > 0:
                            payment_history.append({
                                "installment_number": i,
                                "amount": amount,
                                "date": parsed_date,
                            })
                    except (ValueError, TypeError):
                        continue
        
        if payment_history:
            details["payment_history"] = payment_history
            # Calculate total paid
            total_paid = sum(p.get("amount", 0) for p in payment_history)
            details["total_paid"] = total_paid
            # Calculate remaining amount
            if "amount_owed" in details:
                details["remaining_amount"] = max(0, details["amount_owed"] - total_paid)
        
        # Contact methods (phone, email, phone2, etc.)
        contact_methods = []
        phone_count = 0
        email_count = 0
        
        # Extract phone numbers
        phone_col = column_map.get("phone")
        if phone_col and pd.notna(row.get(phone_col)):
            phone_val = str(row[phone_col]).strip()
            if phone_val and phone_val.lower() != "nan":
                phone_count += 1
                contact_methods.append({
                    "method": "phone",
                    "value": phone_val,
                    "label": f"Phone {phone_count}",
                    "is_preferred": False,
                })
        
        # Extract phone2
        phone2_col = column_map.get("phone2")
        if phone2_col and pd.notna(row.get(phone2_col)):
            phone2_val = str(row[phone2_col]).strip()
            if phone2_val and phone2_val.lower() != "nan":
                phone_count += 1
                contact_methods.append({
                    "method": "phone",
                    "value": phone2_val,
                    "label": f"Phone {phone_count}",
                    "is_preferred": False,
                })
        
        # Extract email
        email_col = column_map.get("email")
        if email_col and pd.notna(row.get(email_col)):
            email_val = str(row[email_col]).strip()
            if email_val and email_val.lower() != "nan":
                email_count += 1
                contact_methods.append({
                    "method": "email",
                    "value": email_val,
                    "label": f"Email {email_count}",
                    "is_preferred": False,
                })
        
        # Extract email2 if present
        email2_col = column_map.get("email2")
        if email2_col and pd.notna(row.get(email2_col)):
            email2_val = str(row[email2_col]).strip()
            if email2_val and email2_val.lower() != "nan":
                email_count += 1
                contact_methods.append({
                    "method": "email",
                    "value": email2_val,
                    "label": f"Email {email_count}",
                    "is_preferred": False,
                })
        
        # Extract preferred contact method
        preferred_col = column_map.get("prefferedcontactmethod") or column_map.get("preferredcontactmethod")
        preferred_contact = None
        if preferred_col and pd.notna(row.get(preferred_col)):
            preferred_val = str(row[preferred_col]).strip().lower()
            if preferred_val and preferred_val != "nan":
                # Map preferred contact to actual contact method
                # Could be "phone", "phone2", "email", "email2", etc.
                preferred_contact = preferred_val
                
                # Mark the preferred contact method
                if preferred_val.startswith("phone"):
                    # Extract number if it's phone2, phone3, etc.
                    if preferred_val == "phone" or preferred_val == "phone1":
                        # Mark first phone as preferred
                        for cm in contact_methods:
                            if cm["method"] == "phone" and cm["label"] == "Phone 1":
                                cm["is_preferred"] = True
                                break
                    elif preferred_val == "phone2":
                        for cm in contact_methods:
                            if cm["method"] == "phone" and cm["label"] == "Phone 2":
                                cm["is_preferred"] = True
                                break
                elif preferred_val.startswith("email"):
                    if preferred_val == "email" or preferred_val == "email1":
                        for cm in contact_methods:
                            if cm["method"] == "email" and cm["label"] == "Email 1":
                                cm["is_preferred"] = True
                                break
                    elif preferred_val == "email2":
                        for cm in contact_methods:
                            if cm["method"] == "email" and cm["label"] == "Email 2":
                                cm["is_preferred"] = True
                                break
                
                # Set preferred contact type (phone/email/sms)
                if preferred_val.startswith("phone"):
                    details["preferred_contact"] = "phone"
                elif preferred_val.startswith("email"):
                    details["preferred_contact"] = "email"
                else:
                    details["preferred_contact"] = preferred_val
        
        # Store contact methods
        if contact_methods:
            details["contact_methods"] = contact_methods
        
        # Communication preferences (if present in CSV)
        comm_pref_cols = [col for col in df.columns if "communication" in col.lower() or ("preference" in col.lower() and "preferred" not in col.lower())]
        comm_pref_cols = [col for col in comm_pref_cols if col.lower() not in ["prefferedcontactmethod", "preferredcontactmethod"]]
        if comm_pref_cols:
            comm_prefs = {}
            for col in comm_pref_cols:
                if pd.notna(row.get(col)):
                    comm_prefs[col.lower()] = str(row[col]).strip()
            if comm_prefs:
                details["communication_preferences"] = comm_prefs
        
        users.append((username, details))
    
    if not users:
        raise HTTPException(status_code=400, detail="No valid users found in CSV file")
    
    return users


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


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Upload an Excel, CSV, or PDF file and create/update User(s).

    - CSV: expects Username, Service, Bill, DueDate, Installment1-4, Installment1Date-4Date columns.
           Creates one user per row.
    - Excel: expects a 'name' column + any other detail columns. Creates one user.
    - PDF: extracts raw text into details["history_text"], requires user_id or name in filename.
    """

    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    filename_lower = (file.filename or "").lower()

    # CSV handling (can create multiple users)
    if filename_lower.endswith(".csv"):
        users_data = _extract_users_from_csv(content)
        created_users = []
        for name, details in users_data:
            # Check if user already exists by name
            existing_users = crud.list_users(db)
            existing = next((u for u in existing_users if u.name.lower() == name.lower()), None)
            
            if existing:
                # Update existing user
                updated_details = {**(existing.details or {}), **details}
                user = crud.upsert_user_from_details(
                    db, user_id=existing.id, name=name, details=updated_details
                )
            else:
                # Create new user
                user = crud.create_user(db, name=name, details=details)
            created_users.append({"user_id": user.id, "name": user.name})
        
        return {
            "message": f"Successfully processed {len(created_users)} user(s)",
            "users": created_users,
        }

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

    raise HTTPException(status_code=400, detail="Unsupported file type. Use .csv, .xlsx, .xls or .pdf")


@router.post("/add-user", response_model=schemas.UserRead)
def add_user_manual(
    body: schemas.ManualUserCreate,
    db: Session = Depends(get_db),
):
    user = crud.create_user(db, name=body.name, details=body.details)
    return user
