from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENVIRONMENT: str = "local"
    DEBUG: bool = True
    PROJECT_NAME: str = "Project Management Backend"

    SECRET_KEY: str = "dev-secret-key-32-chars-long-for-testing-purpose!"
    SESSION_EXPIRE_HOURS: int = 24
    COOKIE_NAME: str = "pm_session"
    CSRF_HEADER_NAME: str = "X-CSRF-Token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    LOGIN_RATE_LIMIT_PER_MINUTE: int = 5

    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5432/jira_db"
    TEST_DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5432/jira_test_db"

    REDIS_URL: str = "redis://localhost:6379/0"
    ENABLE_EXTERNAL_NOTIFICATIONS: bool = False

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except Exception:
                return [i.strip() for i in v.split(",") if i.strip()]
        return v


settings = Settings()
