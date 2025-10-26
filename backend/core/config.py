from typing import List
from pydantic import BaseSettings

class Settings(BaseSettings):
    # API
    host: str = "0.0.0.0"
    port: int = 8080
    cors_origins: List[str] = ["*"]
    
    # Game
    max_players: int = 4
    min_players: int = 2
    max_turns: int = 10
    input_timer_seconds: int = 120
    
    # ADK
    google_api_key: str
    model_name: str = "gemini-2.0-flash-live-001"
    
    # Storage
    storage_type: str = "memory"  

settings = Settings()

