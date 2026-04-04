"""
Seed script: Populate the database with clubs from clubs.csv
Run from the backend directory:
    python -m app.seed_clubs
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.club import Club
from app.models.event import Event
from app.models.rsvp import RSVP
from app.models.follow import Follow

# Ensure all tables exist
Base.metadata.create_all(bind=engine)

# Club data from clubs.csv
CLUBS = [
    {"name": "Coding Club", "instagram": "ssn_codingclub", "email": "codingclub@ssn.edu.in", "category": "TECH"},
    {"name": "Lakshya", "instagram": "ssnlakshya", "email": "lakshya@ssn.edu.in", "category": "NON_TECH"},
    {"name": "IEEECS", "instagram": "ieeecs_ssn", "email": "ieeecs-ssn@ssn.edu.in", "category": "TECH"},
    {"name": "IEEE WIE", "instagram": "ssn_ieee_wie", "email": "ssnieeewie@ssn.edu.in", "category": "TECH"},
    {"name": "Music Club", "instagram": "ssnmusicclub", "email": "ssnmusiclub@ssn.edu.in", "category": "NON_TECH"},
    {"name": "ACM-W", "instagram": "acmw__ssn", "email": "acm-w@ssn.edu.in", "category": "TECH"},
    {"name": "ELC", "instagram": "elcmusings", "email": "ssnelc@ssn.edu.in", "category": "NON_TECH"},
    {"name": "ACM", "instagram": "ssn_acm", "email": "ssnacm@ssn.edu.in", "category": "TECH"},
    {"name": "Build Club", "instagram": "buildclubssn", "email": "buildclub@ssn.edu.in", "category": "TECH"},
    {"name": "Sportium", "instagram": "sportium_ssn", "email": "sportium@ssn.edu.in", "category": "NON_TECH"},
    {"name": "SAE", "instagram": "ssn_sae", "email": "saeclub@ssn.edu.in", "category": "TECH"},
    {"name": "IEEE Vehicle Technology Society", "instagram": "ieee_vts_ssn", "email": "ssnieeevts@ssn.edu.in", "category": "TECH"},
    {"name": "SSN Gaming Club", "instagram": "ssn_gaming_club", "email": "sgc@ssn.edu.in", "category": "NON_TECH"},
    {"name": "Q Factorial", "instagram": "qfactorialthessnquizclub", "email": "qfactorial@ssn.edu.in", "category": "NON_TECH"},
    {"name": "SSN Film Club", "instagram": "ssn_film_club", "email": "filmclub@ssn.edu.in", "category": "NON_TECH"},
    {"name": "IEEE PELS", "instagram": "ssn_ieee_pels", "email": "ieeepels@ssn.edu.in", "category": "TECH"},
    {"name": "IEEE PES", "instagram": "ssn_ieee_pes", "email": "ieeepes@ssn.edu.in", "category": "TECH"},
    {"name": "GFG Campus Body", "instagram": "geeksforgeeks_ssn", "email": "gfgcampusbody@ssn.edu.in", "category": "TECH"},
    {"name": "IEEE SPS", "instagram": "ieee_sps_ssn", "email": "ieeespssb@ssn.edu.in", "category": "TECH"},
    {"name": "Saaral Tamizh Mandram", "instagram": "saaral_tamizh_mandram", "email": "saaraltamilmandram@ssn.edu.in", "category": "NON_TECH"},
]


def seed():
    db = SessionLocal()
    created_clubs = 0
    created_users = 0
    skipped = 0

    try:
        for club_data in CLUBS:
            # Check if club already exists by name
            existing_club = db.query(Club).filter(Club.name == club_data["name"]).first()
            if existing_club:
                print(f"  ⏭  Club '{club_data['name']}' already exists (id={existing_club.id}), skipping.")
                skipped += 1
                continue

            # Find or create a placeholder admin user for this club
            admin = db.query(User).filter(User.email == club_data["email"]).first()
            if not admin:
                admin = User(
                    email=club_data["email"],
                    name=club_data["name"] + " Admin",
                    role="CLUB_ADMIN",
                )
                db.add(admin)
                db.commit()
                db.refresh(admin)
                created_users += 1
                print(f"  👤 Created admin user: {club_data['email']} (id={admin.id})")
            else:
                # Ensure existing user has CLUB_ADMIN role
                if admin.role != "CLUB_ADMIN":
                    admin.role = "CLUB_ADMIN"
                    db.commit()

            # Create the club
            club = Club(
                name=club_data["name"],
                category=club_data["category"],
                instagram_handle=club_data["instagram"],
                admin_id=admin.id,
            )
            db.add(club)
            db.commit()
            db.refresh(club)
            created_clubs += 1
            print(f"  ✅ Created club: {club_data['name']} ({club_data['category']}) → admin_id={admin.id}")

        print(f"\n{'='*50}")
        print(f"  Seed complete!")
        print(f"  Clubs created: {created_clubs}")
        print(f"  Admin users created: {created_users}")
        print(f"  Skipped (already exist): {skipped}")
        print(f"{'='*50}")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🌱 Seeding clubs into database...\n")
    seed()
