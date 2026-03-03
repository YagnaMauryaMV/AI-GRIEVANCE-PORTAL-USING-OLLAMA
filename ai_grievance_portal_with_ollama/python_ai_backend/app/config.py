from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./grievance.db"
    OTP_EXPIRY_MINUTES: int = 5

    LLAMA_API_BASE: str = "http://localhost:8001/v1"
    LLAMA_MODEL: str = "llama-3.2"

    # 🔹 Twilio settings
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_FROM_NUMBER: str | None = None

    class Config:
        env_file = ".env"


settings = Settings()