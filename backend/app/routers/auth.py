from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import oauth, create_access_token, get_current_user
import re
import json

router = APIRouter()


def _safe_json_list(raw_value):
    if not raw_value:
        return []
    try:
        data = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []

# Allowed club admin emails (in production, move to DB table)
ALLOWED_CLUB_EMAILS = {
    # Test account
    "thirumuruganra@gmail.com",
    "vishmuralee1006@gmail.com",
    "tanisha.sriram2006@gmail.com",
    # Club accounts
    "codingclub@ssn.edu.in",
    "lakshya@ssn.edu.in",
    "ieeecs-ssn@ssn.edu.in",
    "ssnieeewie@ssn.edu.in",
    "ssnmusiclub@ssn.edu.in",
    "acm-w@ssn.edu.in",
    "ssnelc@ssn.edu.in",
    "ssnacm@ssn.edu.in",
    "buildclub@ssn.edu.in",
    "sportium@ssn.edu.in",
    "saeclub@ssn.edu.in",
    "ssnieeevts@ssn.edu.in",
    "sgc@ssn.edu.in",
    "qfactorial@ssn.edu.in",
    "filmclub@ssn.edu.in",
    "ieeepels@ssn.edu.in",
    "ieeepes@ssn.edu.in",
    "gfgcampusbody@ssn.edu.in",
    "ieeespssb@ssn.edu.in",
    "saaraltamilmandram@ssn.edu.in",
}

# Regex for student emails
STUDENT_EMAIL_REGEX = re.compile(r'.*[0-9]{4,}@ssn\.edu\.in$')


@router.get('/login')
async def login(request: Request):
    """Initiates the Google OAuth2 flow."""
    redirect_uri = request.url_for('auth_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get('/callback', name='auth_callback')
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    """
    Handles the callback from Google OAuth2.
    Sets a JWT cookie and redirects to frontend.
    """
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail="OAuth Error: " + str(e))

    user_info = token.get('userinfo')
    if not user_info:
        user_info = await oauth.google.userinfo(token=token)

    if not user_info:
        raise HTTPException(status_code=400, detail="Could not retrieve user info")

    email = user_info.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Google account must provide an email address.")
        
    name = user_info.get('name')
    picture = user_info.get('picture')
    google_token = token.get('access_token')

    # Determine Role via regex
    role = "STUDENT"
    if STUDENT_EMAIL_REGEX.match(email):
        role = "STUDENT"
    elif email in ALLOWED_CLUB_EMAILS:
        role = "CLUB_ADMIN"

    # Upsert user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name=name,
            role=role,
            google_token=google_token,
            picture=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.google_token = google_token
        user.name = name
        user.picture = picture
        user.role = role
        db.commit()

    # Create JWT token
    jwt_token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
    })

    # Determine redirect URL
    # Club admins should go to the admin flow regardless of student profile completeness fields.
    if user.role == "CLUB_ADMIN":
        redirect_url = "http://localhost:5173/admin"
    else:
        user_interests = _safe_json_list(user.interests)
        redirect_url = "http://localhost:5173/dashboard"
        if not user.batch or not user.department or not user.register_number or len(user_interests) < 3:
            redirect_url = "http://localhost:5173/profile"

    # Set JWT as cookie and redirect
    response = RedirectResponse(url=redirect_url, status_code=302)
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=False,       # Frontend needs to read it for API calls
        samesite="lax",
        max_age=7 * 24 * 3600,  # 7 days
        path="/",
    )
    return response


@router.get('/me')
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's info."""
    joined_clubs_list = _safe_json_list(current_user.joined_clubs)
    interests_list = _safe_json_list(current_user.interests)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture,
        "role": current_user.role,
        "batch": current_user.batch,
        "department": current_user.department,
        "register_number": current_user.register_number,
        "joined_clubs": joined_clubs_list,
        "interests": interests_list,
    }


@router.get('/logout')
async def logout(request: Request):
    """Clear the JWT cookie and redirect to landing."""
    response = RedirectResponse(url="http://localhost:5173/", status_code=302)
    response.delete_cookie("access_token", path="/")
    return response
