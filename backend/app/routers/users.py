from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas import UserUpdate
import json
from typing import List

router = APIRouter()

@router.get("/{user_id}")
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    joined_clubs_list = json.loads(user.joined_clubs) if user.joined_clubs else []
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role,
        "batch": user.batch,
        "department": user.department,
        "joined_clubs": joined_clubs_list
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
    if user_update.joined_clubs is not None:
        user.joined_clubs = json.dumps(user_update.joined_clubs)

    db.commit()
    db.refresh(user)
    
    joined_clubs_list = json.loads(user.joined_clubs) if user.joined_clubs else []
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role,
        "batch": user.batch,
        "department": user.department,
        "joined_clubs": joined_clubs_list
    }
