import os
import shutil
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    
    # External APIs
    openai_api_key: str = ""
    google_fact_check_api_key: str = ""
    
    # Custom FFmpeg Path override
    ffmpeg_path: str = ""
    
    # Audio Pipeline
    audio_sample_rate: int = 16000
    audio_channels: int = 1
    enable_low_latency_ffmpeg: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

# Directory paths
UPLOADS_DIR = BASE_DIR / "uploads"
TEMP_DIR = BASE_DIR / "temp"
FRONTEND_DIR = ROOT_DIR / "frontend"
STATIC_DIR = FRONTEND_DIR if FRONTEND_DIR.exists() else (BASE_DIR / "static")

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

def resolve_ffmpeg_path() -> str:
    """Finds the best available FFmpeg binary on the system."""
    if settings.ffmpeg_path and os.path.exists(settings.ffmpeg_path):
        return settings.ffmpeg_path
        
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
        
    local_bin_ffmpeg = ROOT_DIR / "bin" / "ffmpeg.exe"
    if local_bin_ffmpeg.exists():
        return str(local_bin_ffmpeg)
        
    return "ffmpeg"

FFMPEG_BINARY = resolve_ffmpeg_path()
