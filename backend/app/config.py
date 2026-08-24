from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Attendance System"
    ENV: str = "development"

    # Database
    DATABASE_URL: str = "sqlite:///./attendance.db"
    # Example for Postgres:
    # DATABASE_URL: str = "postgresql://user:password@localhost:5432/attendance_db"

    # JWT / Auth
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Biometric device polling (ZKTeco). Off by default - turn on once you
    # have a real device configured under Integration > Biometric Devices.
    ENABLE_BIOMETRIC_SYNC: bool = False
    BIOMETRIC_SYNC_INTERVAL_MINUTES: int = 2

    class Config:
        env_file = ".env"


settings = Settings()
