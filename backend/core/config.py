import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Application configuration"""
    
    # API Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    CORS_ORIGINS: List[str] = ["*"]
    
    # Game Settings
    MAX_PLAYERS: int = 10
    MIN_PLAYERS: int = 2
    MAX_TURNS: int = 10 
    INPUT_TIMER_SECONDS: int = 120
    VOTING_TIMER_SECONDS: int = 60
    
    # Room Settings
    IDLE_TIMEOUT_MINUTES: int = 30  
    ROOM_ID_LENGTH: int = 6
    
    # ADK Settings
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

    MODEL_NAME: str = "gemini-2.5-flash-lite"
    IMAGE_MODEL_NAME: str = "gemini-2.5-flash-image"
    TTS_MODEL_NAME: str = "gemini-2.5-flash-tts"
    
    # Error Handling
    MAX_RETRIES: int = 3  
    RETRY_DELAY_SECONDS: float = 2.0
    RETRY_BACKOFF_MULTIPLIER: float = 1.5
    
    # Storage
    STORAGE_TYPE: str = "memory" 
    
    # Logging
    LOG_LEVEL: str = "DEBUG"
    
    @classmethod
    def validate(cls):
        """Validate critical settings on startup"""
        if not cls.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        if cls.MAX_TURNS < 1:
            raise ValueError("MAX_TURNS must be at least 1")
        if cls.MIN_PLAYERS < 2:
            raise ValueError("MIN_PLAYERS must be at least 2")
        if cls.MAX_PLAYERS < cls.MIN_PLAYERS:
            raise ValueError("MAX_PLAYERS must be >= MIN_PLAYERS")

settings = Settings()