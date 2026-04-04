from app.database import engine
from sqlalchemy import inspect
import os

inspector = inspect(engine)
if "rsvps" in inspector.get_table_names():
    for col in inspector.get_columns("rsvps"):
        print(col["name"])
