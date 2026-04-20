from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.club_member import ClubMember
from app.models.user import User
from app.schemas import UserUpdate
from app.core.security import get_current_user
import json
import re
from datetime import datetime
from typing import List

router = APIRouter()

REGISTER_NUMBER_PATTERN = re.compile(r"^3122\d{9}$")
PASSOUT_YEAR_PATTERN = re.compile(r"^\d{4}$")
PASSOUT_YEAR_MAX_AHEAD = 6


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


def _normalize_text(value) -> str:
    return str(value or "").strip().lower()


def _normalize_compact(value) -> str:
    return "".join(ch for ch in _normalize_text(value) if ch.isalnum())


def _validate_register_number(value: str) -> str:
    normalized = str(value or "").strip()
    if not REGISTER_NUMBER_PATTERN.fullmatch(normalized):
        raise HTTPException(status_code=422, detail="Register number must be exactly 13 digits and start with 3122")
    return normalized


def _validate_passout_year(value: str) -> str:
    normalized = str(value or "").strip()
    if not PASSOUT_YEAR_PATTERN.fullmatch(normalized):
        raise HTTPException(status_code=422, detail="Passout year must be a 4-digit year")

    current_year = datetime.now().year
    min_passout_year = current_year
    max_passout_year = current_year + PASSOUT_YEAR_MAX_AHEAD
    year_value = int(normalized)
    if year_value < min_passout_year or year_value > max_passout_year:
        raise HTTPException(
            status_code=422,
            detail=f"Passout year must be between {min_passout_year} and {max_passout_year}",
        )

    return normalized


def _get_degree_duration(degree_str) -> int | None:
    normalized = _normalize_compact(degree_str)
    if not normalized:
        return None

    if "mtech" in normalized and "integrated" in normalized:
        return 5
    if normalized == "be" or "btech" in normalized:
        return 4
    if normalized == "me" or "mtech" in normalized:
        return 2
    return None


def _get_admission_year_from_register_number(register_number) -> int | None:
    digits_only = "".join(ch for ch in str(register_number or "") if ch.isdigit())
    # Admission year can only be derived from canonical SSN register numbers.
    if not REGISTER_NUMBER_PATTERN.fullmatch(digits_only):
        return None

    try:
        code = int(digits_only[4:6])
    except ValueError:
        return None

    admission_year = 2000 + code
    current_year = datetime.now().year
    if admission_year > current_year:
        return None

    return admission_year


def _calculate_year_from_admission(admission_year: int | None, duration: int | None, current_year: int) -> str | None:
    if not admission_year or not duration:
        return None

    year_number = current_year - admission_year
    if year_number <= 0:
        year_number = 1

    if year_number > duration:
        return "Alumni"

    roman = ["", "I", "II", "III", "IV", "V"]
    return roman[year_number] if year_number < len(roman) else "-"


def _calculate_year_label(batch, degree, register_number) -> str:
    duration = _get_degree_duration(degree)
    if not duration:
        return "-"

    from datetime import datetime

    current_year = datetime.now().year
    admission_year = _get_admission_year_from_register_number(register_number)
    year_from_register = _calculate_year_from_admission(admission_year, duration, current_year)
    if year_from_register:
        return year_from_register

    try:
        passout_year = int(str(batch or "").strip())
    except ValueError:
        return "-"

    diff = passout_year - current_year
    if diff < 0:
        return "Alumni"

    year_number = duration - diff
    if year_number < 1 or year_number > duration:
        return "-"

    roman = ["", "I", "II", "III", "IV", "V"]
    return roman[year_number] if year_number < len(roman) else "-"


def _normalize_year_filter(year_value) -> str:
    raw = _normalize_text(year_value)
    if raw in {"i", "1", "1st", "first"}:
        return "I"
    if raw in {"ii", "2", "2nd", "second"}:
        return "II"
    if raw in {"iii", "3", "3rd", "third"}:
        return "III"
    if raw in {"iv", "4", "4th", "fourth"}:
        return "IV"
    if raw in {"v", "5", "5th", "fifth"}:
        return "V"
    if raw == "alumni":
        return "Alumni"
    return ""


@router.get("/students")
def list_registered_students(
    q: str = Query(default="", max_length=120),
    department: str | None = Query(default=None),
    year: str | None = Query(default=None),
    exclude_club_id: int | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List registered student users for member-add flow with search and filters."""
    if current_user.role != "CLUB_ADMIN":
        raise HTTPException(status_code=403, detail="Only CLUB_ADMIN users can list students")

    normalized_query = _normalize_text(q)
    normalized_department = _normalize_text(department)
    normalized_year = _normalize_year_filter(year)

    excluded_user_ids = set()
    if exclude_club_id is not None:
        excluded_rows = db.query(ClubMember.user_id).filter(ClubMember.club_id == exclude_club_id).all()
        excluded_user_ids = {row[0] for row in excluded_rows}

    students = db.query(User).filter(User.role == "STUDENT").all()

    filtered_students = []
    for student in students:
        if student.id in excluded_user_ids:
            continue

        student_year = _calculate_year_label(student.batch, student.degree, student.register_number)

        if normalized_department and _normalize_text(student.department) != normalized_department:
            continue
        if normalized_year and student_year != normalized_year:
            continue

        if normalized_query:
            searchable_values = [
                _normalize_text(student.name),
                _normalize_text(student.email),
                _normalize_text(student.register_number),
                _normalize_compact(student.register_number),
                _normalize_text(student.department),
            ]
            if not any(normalized_query in value for value in searchable_values):
                continue

        filtered_students.append(
            {
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "picture": student.picture,
                "department": student.department,
                "degree": student.degree,
                "batch": student.batch,
                "register_number": student.register_number,
                "year": student_year,
            }
        )

    filtered_students.sort(
        key=lambda student: (
            _normalize_text(student.get("name") or student.get("email")),
            student["id"],
        )
    )

    total = len(filtered_students)
    return {
        "total": total,
        "students": filtered_students[:limit],
    }

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
        user.batch = _validate_passout_year(user_update.batch)
    if user_update.department is not None:
        user.department = user_update.department
    if user_update.degree is not None:
        user.degree = user_update.degree
    if user_update.register_number is not None:
        user.register_number = _validate_register_number(user_update.register_number)
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
