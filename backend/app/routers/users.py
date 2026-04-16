from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas import UserUpdate
import json
from typing import List

router = APIRouter()


def _safe_json_list(raw_value):
    if not raw_value:
        return []
    try:
        data = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []


def _normalize_interest_values(interests: List[str]) -> List[str]:
    normalized = []
    seen = set()
    for item in interests:
        cleaned = str(item).strip()
        if not cleaned:
            continue
        dedupe_key = cleaned.lower()
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        normalized.append(cleaned)
    return normalized

@router.get("/{user_id}")
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    joined_clubs_list = _safe_json_list(user.joined_clubs)
    interests_list = _safe_json_list(user.interests)
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role,
        "batch": user.batch,
        "department": user.department,
        "degree": user.degree,
        "register_number": user.register_number,
        "joined_clubs": joined_clubs_list,
        "interests": interests_list,
    }

@router.put("/{user_id}")
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.batch is not None:
        user.batch = user_update.batch
    if user_update.department is not None:
        user.department = user_update.department
    if user_update.degree is not None:
        user.degree = user_update.degree
    if user_update.register_number is not None:
        user.register_number = user_update.register_number
    if user_update.joined_clubs is not None:
        user.joined_clubs = json.dumps(user_update.joined_clubs)
    if user_update.interests is not None:
        normalized_interests = _normalize_interest_values(user_update.interests)
        if len(normalized_interests) < 3:
            raise HTTPException(status_code=422, detail="Please select at least 3 interests")
        user.interests = json.dumps(normalized_interests)

    db.commit()
    db.refresh(user)
    
    joined_clubs_list = _safe_json_list(user.joined_clubs)
    interests_list = _safe_json_list(user.interests)
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role,
        "batch": user.batch,
        "department": user.department,
        "degree": user.degree,
        "joined_clubs": joined_clubs_list,
        "interests": interests_list,
    }
