from fastapi import APIRouter
from datetime import datetime, timezone
from app.db.session import check_db_connection
from app.core.config import settings

router = APIRouter(tags=["Health & Status"])


@router.get("/health")
def get_health():
    db_status = check_db_connection()
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "phase": "0 - Skeleton Connected",
    }
