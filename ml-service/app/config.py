import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "InterviewIQ ML Service"
    
    # Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATASETS_DIR: str = os.path.join(BASE_DIR, "..", "datasets")
    MODELS_DIR: str = os.path.join(BASE_DIR, "..", "models")
    TEMP_DIR: str = os.path.join(BASE_DIR, "temp")

    # Host & Port
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    class Config:
        case_sensitive = True

settings = Settings()

# Ensure temp directory exists
os.makedirs(settings.TEMP_DIR, exist_ok=True)
