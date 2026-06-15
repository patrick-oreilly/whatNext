import string
import random
import logging
import asyncio
from typing import Optional, List, Dict
from datetime import datetime

from backend.core.models import (
    GameRoom, GamePhase, StoryLineType,
    StorySegment, RoomStateResponse
)
from backend.core.storage import Storage
from backend.core.errors import (
    RoomNotFoundError, RoomFullError, PlayerNotInRoomError,
    InvalidGamePhaseError, DuplicatePlayerError
)
from backend.core.config import settings

logger = logging.getLogger(__name__)


class RoomManager:
    """Pure CRUD manager for game rooms — no game-logic methods."""

    def __init__(self, storage: Storage):
        self.storage = storage
        self._room_locks: Dict[str, asyncio.Lock] = {}
        self._locks_lock = asyncio.Lock()
        logger.info("RoomManager initialized (CRUD-only)")

    async def get_room_lock(self, room_id: str) -> asyncio.Lock:
        async with self._locks_lock:
            if room_id not in self._room_locks:
                self._room_locks[room_id] = asyncio.Lock()
            return self._room_locks[room_id]

    # ------------------------------------------------------------------
    # Core CRUD
    # ------------------------------------------------------------------

    def create_room(self, storyline: StoryLineType, max_turns: int = None) -> str:
        room_id = self._generate_room_id()
        room = GameRoom(
            room_id=room_id,
            storyline=storyline,
            max_turns=max_turns or settings.MAX_TURNS
        )
        self.storage.save_room(room)
        logger.info(f"Created room {room_id} with storyline {storyline}")
        return room_id

    def get_room(self, room_id: str) -> GameRoom:
        room = self.storage.get_room(room_id)
        if not room:
            raise RoomNotFoundError(f"Room {room_id} not found")
        return room

    def save_room(self, room: GameRoom) -> None:
        self.storage.save_room(room)

    def delete_room(self, room_id: str) -> None:
        self.storage.delete_room(room_id)
        logger.info(f"Deleted room {room_id}")

    def list_rooms(self) -> List[str]:
        return self.storage.list_rooms()

    # ------------------------------------------------------------------
    # Player management
    # ------------------------------------------------------------------

    def add_player(self, room_id: str, player_name: str) -> None:
        room = self.get_room(room_id)

        if room.phase != GamePhase.LOBBY:
            raise InvalidGamePhaseError(
                f"Cannot join room {room_id} - game already started",
                details=f"Current phase: {room.phase}"
            )

        if room.is_full(settings.MAX_PLAYERS):
            raise RoomFullError(
                f"Room {room_id} is full",
                details=f"Maximum {settings.MAX_PLAYERS} players allowed"
            )

        if player_name.lower() in [p.lower() for p in room.players]:
            raise DuplicatePlayerError(
                f"Player name '{player_name}' already taken in room {room_id}"
            )

        room.players.append(player_name)
        room.scores[player_name] = 0
        room.update_activity()
        self.storage.save_room(room)
        logger.info(f"Player '{player_name}' joined room {room_id}")

    def remove_player(self, room_id: str, player_name: str) -> None:
        room = self.get_room(room_id)

        if player_name not in room.players:
            raise PlayerNotInRoomError(
                f"Player '{player_name}' not in room {room_id}"
            )

        room.players.remove(player_name)
        if player_name in room.scores:
            del room.scores[player_name]

        room.update_activity()
        self.storage.save_room(room)
        logger.info(f"Player '{player_name}' left room {room_id}")

        if len(room.players) == 0:
            self.delete_room(room_id)

    # ------------------------------------------------------------------
    # Story segments
    # ------------------------------------------------------------------

    def add_story_segment(
        self,
        room_id: str,
        content,
        winning_player: Optional[str] = None
    ) -> None:
        room = self.get_room(room_id)
        segment = StorySegment(
            turn=room.turn,
            content=content,
            winning_player=winning_player
        )
        room.story_history.append(segment)
        room.update_activity()
        self.storage.save_room(room)
        logger.debug(f"Added story segment to room {room_id}")

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    def get_room_state_response(self, room_id: str) -> RoomStateResponse:
        room = self.get_room(room_id)
        return RoomStateResponse(
            room_id=room.room_id,
            storyline=room.storyline,
            players=room.players,
            scores=room.scores,
            turn=room.turn,
            phase=room.phase,
            story_history=room.story_history,
            player_inputs=room.player_inputs,
            max_turns=room.max_turns,
            input_phase_start_time=room.input_phase_start_time,
            voting_phase_start_time=room.voting_phase_start_time,
            timed_out_players=room.timed_out_players,
            story_has_ended=room.story_has_ended,
            voting_timeout_seconds=settings.VOTING_TIMER_SECONDS,
            input_timeout_seconds=settings.INPUT_TIMER_SECONDS
        )

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def cleanup_idle_rooms(self) -> List[str]:
        deleted_ids = []
        room_ids = self.list_rooms()
        for room_id in room_ids:
            try:
                room = self.get_room(room_id)
                if room.is_idle(settings.IDLE_TIMEOUT_MINUTES):
                    self.delete_room(room_id)
                    deleted_ids.append(room_id)
                    logger.info(f"Cleaned up idle room {room_id}")
            except RoomNotFoundError:
                continue

        if deleted_ids:
            logger.info(f"Cleanup completed: {len(deleted_ids)} idle rooms deleted")
        return deleted_ids

    # ------------------------------------------------------------------
    # ID generation
    # ------------------------------------------------------------------

    def _generate_room_id(self) -> str:
        chars = string.ascii_uppercase + string.digits
        while True:
            room_id = ''.join(random.choices(chars, k=settings.ROOM_ID_LENGTH))
            if not self.storage.room_exists(room_id):
                return room_id
