from abc import ABC, abstractmethod
from typing import Dict, Optional, List
from backend.core.models import GameRoom
import logging

logger = logging.getLogger(__name__)

# Storage abstract class for saving and retrieving game room
# Any DB can be implemented now

class Storage(ABC):
    """Abstract storage interface for game rooms"""
    
    @abstractmethod
    def save_room(self, room: GameRoom) -> None:
        """Save a game room"""
        pass
    
    @abstractmethod
    def get_room(self, room_id: str) -> Optional[GameRoom]:
        """Retrieve a game room by ID"""
        pass
    
    @abstractmethod
    def delete_room(self, room_id: str) -> None:
        """Delete a game room"""
        pass
    
    @abstractmethod
    def list_rooms(self) -> List[str]:
        """List all room IDs"""
        pass
    
    @abstractmethod
    def room_exists(self, room_id: str) -> bool:
        """Check if room exists"""
        pass


# Initial in memory implementation

class InMemoryStorage(Storage):
    """In-memory storage implementation using dictionaries"""
    
    def __init__(self):
        self._rooms: Dict[str, GameRoom] = {}
        logger.info("Initialized InMemoryStorage")
    
    def save_room(self, room: GameRoom) -> None:
        """Save room to memory"""
        self._rooms[room.room_id] = room
        logger.debug(f"Saved room {room.room_id}")
    
    def get_room(self, room_id: str) -> Optional[GameRoom]:
        """Get room from memory"""
        room = self._rooms.get(room_id)
        if room:
            logger.debug(f"Retrieved room {room_id}")
        else:
            logger.debug(f"Room {room_id} not found")
        return room
    
    def delete_room(self, room_id: str) -> None:
        """Delete room from memory"""
        if room_id in self._rooms:
            del self._rooms[room_id]
            logger.info(f"Deleted room {room_id}")
    
    def list_rooms(self) -> List[str]:
        """List all room IDs"""
        return list(self._rooms.keys())
    
    def room_exists(self, room_id: str) -> bool:
        """Check if room exists"""
        return room_id in self._rooms
    
    def count_rooms(self) -> int:
        """Count total rooms"""
        return len(self._rooms)

#
def create_storage(storage_type: str = "memory") -> Storage:
    """Factory function to create storage instance"""
    if storage_type == "memory":
        return InMemoryStorage()
    else:
        raise ValueError(f"Unknown storage type: {storage_type}")