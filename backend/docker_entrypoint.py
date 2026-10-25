import os
import sys
import time
from sqlalchemy import text

# Ensure backend root is on sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine, Base
import app.models  # Ensures all SQLAlchemy models are registered
from seed_categories import seed_categories
from seed_users import seed_users


def wait_for_postgres(max_retries: int = 30, delay: int = 2) -> bool:
    """Waits for PostgreSQL to become ready and accept connections."""
    print("--> Checking PostgreSQL database connection...")
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"--> PostgreSQL connection successful (attempt {attempt}/{max_retries}).")
            return True
        except Exception as e:
            print(f"--> PostgreSQL not ready yet (attempt {attempt}/{max_retries}): {e}")
            time.sleep(delay)
    return False


def setup_and_seed():
    """Initializes schema and runs idempotent seeders."""
    if not wait_for_postgres():
        print("--> ERROR: Timed out waiting for PostgreSQL.")
        sys.exit(1)

    print("--> Ensuring all database tables exist...")
    Base.metadata.create_all(bind=engine)

    print("--> Running database seeds...")
    try:
        seed_categories()
    except Exception as e:
        print(f"--> Notice during category seeding: {e}")

    try:
        seed_users()
    except Exception as e:
        print(f"--> Notice during user seeding: {e}")


if __name__ == "__main__":
    setup_and_seed()

    # Start Uvicorn ASGI server
    import uvicorn
    from app.core.config import settings

    print(f"--> Starting Uvicorn API server on port {settings.BACKEND_PORT}...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.BACKEND_PORT,
        reload=True,
    )
