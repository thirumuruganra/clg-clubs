from fastapi import APIRouter, Depends, Query, Request, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import oauth
import re
import urllib.parse
from typing import Optional

router = APIRouter()

# Simple mock for allowed club emails (replace with DB lookup or config)
ALLOWED_CLUB_EMAILS = {
    "ieeecs-ssn@ssn.edu.in",
    "acm-w@ssn.edu.in",
    "ssnacm@ssn.edu.in",
}

# Regex for student emails
STUDENT_EMAIL_REGEX = re.compile(r'.*[0-9]{4,}@ssn\.edu\.in$')

@router.get('/login')
async def login(request: Request):
    """
    Initiates the Google OAuth2 flow.
    Redirects the user to Google's login page.
    """
    redirect_uri = request.url_for('auth_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get('/callback', name='auth_callback')
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    """
    Handles the callback from Google OAuth2.
    Exchanges the authorization code for an access token.
    Retrieves user info and assigns roles based on email pattern.
    """
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail="OAuth Error: " + str(e))

    user_info = token.get('userinfo')
    if not user_info:
        # Sometimes userinfo is inside 'id_token' claims or needs a separate fetch
        # but modern Authlib usually handles it if scope 'openid' is present
        user_info = await oauth.google.userinfo(token=token)

    if not user_info:
         raise HTTPException(status_code=400, detail="Could not retrieve user info")

    email = user_info.get('email')
    name = user_info.get('name')
    picture = user_info.get('picture')
    google_token = token.get('access_token') # Store access token for calendar integration

    # Determine Role
    role = "STUDENT" # Default fallback
    if STUDENT_EMAIL_REGEX.match(email):
        role = "STUDENT"
    elif email in ALLOWED_CLUB_EMAILS:
        role = "CLUB_ADMIN"
    else:
        role = "STUDENT" # Guest/Fallback

    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create new user
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
        # Update existing user's token and potentially role/name
        user.google_token = google_token
        user.name = name # Update name if changed
        user.picture = picture # Update picture if changed
        # Role update logic could be complex (e.g. manual override), 
        # but for now we re-evaluate on login or keep existing?
        # Let's update role to keep it executing the logic:
        user.role = role 
        db.commit()
    
    # In a real app, you'd create a JWT session here and return it or set a cookie.
    # For now, redirect to frontend with a query param (simple demo)
    # OR set a secure HTTPOnly cookie using FastAPI's response.
    
    encoded_name = urllib.parse.quote(user.name) if user.name else "Student"
    encoded_picture = urllib.parse.quote(user.picture) if user.picture else ""
    
    # Redirect to Frontend dashboard (localhost:5173 for Vite dev)
    # We'll attach a simple session token or just the user ID for now as a query param (INSECURE for prod)
    # Better: Use a JWT
    
    redirect_url = f'http://localhost:5173/dashboard?user_id={user.id}&role={role}&name={encoded_name}&picture={encoded_picture}&email={user.email}'
    
    if not user.batch or not user.department:
         redirect_url += "&incomplete_profile=true"
    else:
         redirect_url += f"&batch={user.batch}&department={user.department}&joined_clubs={urllib.parse.quote(user.joined_clubs)}"

    return RedirectResponse(url=redirect_url)

@router.get('/logout')
async def logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse(url='/')
