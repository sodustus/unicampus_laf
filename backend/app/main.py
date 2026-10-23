from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
import app.models  # Ensure all SQLAlchemy models are registered
from app.routers import health, auth, categories, reports, claims, recovery, audit, dashboard, admin

# Automatically ensure database tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Campus Lost & Found Management System API",
    version="1.0.0",
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(auth.router)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(categories.router)
app.include_router(categories.router, prefix=settings.API_V1_STR)
app.include_router(reports.router)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(claims.router)
app.include_router(claims.router, prefix=settings.API_V1_STR)
app.include_router(recovery.router)
app.include_router(recovery.router, prefix=settings.API_V1_STR)
app.include_router(audit.router)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(admin.router)
app.include_router(admin.router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": "Welcome to Campus Lost & Found Management System API",
        "docs": "/docs",
        "health": "/health",
    }
