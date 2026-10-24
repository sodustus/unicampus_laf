from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Campus Lost & Found System"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "postgresql+psycopg://postgres:MySecurePass2026!@localhost:5432/unicampus_laf"
    BACKEND_PORT: int = 8000
    BACKEND_HOST: str = "127.0.0.1"
    SECRET_KEY: str = "supersecretjwtkey_unicampus_lost_and_found_2026_grad_project"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
