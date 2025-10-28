import string
import random
import logging
from typing import Optional, List, Dict
from datetime import datetime

from backend.core.models import (
    GameRoom, GamePhase, StoryLineType, PlayerInput,
    StorySegment, RoomStateResponse, VotingResultsResponse
)
from backend.core.storage import Storage
from backend.core.errors import (
    RoomNotFoundError, RoomFullError, PlayerNotInRoomError,
    InvalidGamePhaseError, NotEnoughPlayersError, DuplicatePlayerError,
    VotingError
)
from backend.core.config import settings

logger = logging.getLogger(__name__)

# Room manager class

class RoomManager:
    """Manages game rooms and game state logic"""
    
    def __init__(self, storage: Storage):
        self.storage = storage
        logger.info("RoomManager initialized")
    
  # Create and manage room methods
    
    def create_room(self, storyline: StoryLineType, max_turns: int = None) -> str:
        """
        Create a new game room with unique ID
        
        Returns:
            room_id: 6-character uppercase room code
        """
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
        """
        Get room by ID, raises error if not found
        
        Raises:
            RoomNotFoundError: If room doesn't exist
        """
        room = self.storage.get_room(room_id)
        if not room:
            raise RoomNotFoundError(f"Room {room_id} not found")
        return room
    
    def delete_room(self, room_id: str) -> None:
        """Delete a room"""
        self.storage.delete_room(room_id)
        logger.info(f"Deleted room {room_id}")
    
    def list_rooms(self) -> List[str]:
        """List all active room IDs"""
        return self.storage.list_rooms()
    
    def get_room_state(self, room_id: str) -> RoomStateResponse:
        """Get current state of room for API response"""
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
            timed_out_players=room.timed_out_players
        )
    
    
    # Player management 

    def add_player(self, room_id: str, player_name: str) -> None:
        """
        Add player to room
        
        Raises:
            RoomNotFoundError: Room doesn't exist
            RoomFullError: Room already has max players
            DuplicatePlayerError: Player name already taken
            InvalidGamePhaseError: Game already started
        """
        room = self.get_room(room_id)
        
        # Check if game already started

        if room.phase != GamePhase.LOBBY:
            raise InvalidGamePhaseError(
                f"Cannot join room {room_id} - game already started",
                details=f"Current phase: {room.phase}"
            )
        
        # Check if room is full
        if room.is_full(settings.MAX_PLAYERS):
            raise RoomFullError(
                f"Room {room_id} is full",
                details=f"Maximum {settings.MAX_PLAYERS} players allowed"
            )
        
        # Check for duplicate name
        if player_name in room.players:
            raise DuplicatePlayerError(
                f"Player name '{player_name}' already taken in room {room_id}"
            )
        
        # Add player
        room.players.append(player_name)
        room.scores[player_name] = 0
        room.update_activity()
        
        self.storage.save_room(room)
        logger.info(f"Player '{player_name}' joined room {room_id}")
    
    def remove_player(self, room_id: str, player_name: str) -> None:
        """Remove player from room"""
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
        
        # Delete room if empty
        if len(room.players) == 0:
            self.delete_room(room_id)
    
    
    # Game flow 
    
    def start_game(self, room_id: str) -> None:
        """
        Start the game
        
        Raises:
            RoomNotFoundError: Room doesn't exist
            NotEnoughPlayersError: Not enough players to start
            InvalidGamePhaseError: Game already started
        """
        room = self.get_room(room_id)
        
        # Check phase
        if room.phase != GamePhase.LOBBY:
            raise InvalidGamePhaseError(
                f"Cannot start game - already in phase {room.phase}"
            )
        
        # Check player count
        if not room.can_start(settings.MIN_PLAYERS):
            raise NotEnoughPlayersError(
                f"Need at least {settings.MIN_PLAYERS} players to start",
                details=f"Current players: {len(room.players)}"
            )
        
        # Start game
        room.phase = GamePhase.GENERATING_STORY
        room.turn = 1
        room.update_activity()
        
        self.storage.save_room(room)
        logger.info(f"Game started in room {room_id} with {len(room.players)} players")
    
    def advance_turn(self, room_id: str) -> None:
        """Advance to next turn"""
        room = self.get_room(room_id)
        
        room.turn += 1
        room.player_inputs = []  # Clear inputs for next turn
        room.update_activity()
        
        # Check if game should end
        if room.should_end_game():
            room.phase = GamePhase.GAME_OVER
            logger.info(f"Game ended in room {room_id} after {room.turn} turns")
        else:
            room.phase = GamePhase.PLAYER_INPUT
            logger.info(f"Advanced to turn {room.turn} in room {room_id}")
        
        self.storage.save_room(room)
    
    def set_phase(self, room_id: str, phase: GamePhase) -> None:
        """Set game phase"""
        room = self.get_room(room_id)
        room.phase = phase

        # Start input phase timer
        if phase == GamePhase.PLAYER_INPUT:
            room.input_phase_start_time = datetime.now()
            room.timed_out_players = []  # Reset timeout tracking

        room.update_activity()
        self.storage.save_room(room)
        logger.debug(f"Room {room_id} phase changed to {phase}")

    def handle_input_timeout(self, room_id: str) -> None:
        """
        Handle input phase timeout

        - Identifies players who haven't submitted
        - Marks them as timed out
        - Advances to voting phase with only submitted inputs (if multiple)
        - Uses single submission directly (if only one)
        - Generates natural continuation (if none)
        """
        room = self.get_room(room_id)

        # Validate phase
        if room.phase != GamePhase.PLAYER_INPUT:
            raise InvalidGamePhaseError(
                f"Cannot handle timeout - current phase is {room.phase}",
                details="Timeout only applies to PLAYER_INPUT phase"
            )

        # Find players who submitted
        submitted_players = [inp.player_name for inp in room.player_inputs]

        # Identify timed out players
        room.timed_out_players = [
            player for player in room.players
            if player not in submitted_players
        ]

        logger.info(
            f"Input timeout in room {room_id}: {len(room.timed_out_players)} player(s) timed out"
        )

        # Handle based on number of submissions
        if len(room.player_inputs) > 1:
            # Multiple submissions: proceed to voting
            room.phase = GamePhase.VOTING
            room.update_activity()
            self.storage.save_room(room)
            logger.info(
                f"Advanced to voting with {len(room.player_inputs)} inputs in room {room_id}"
            )
        elif len(room.player_inputs) == 1:
            # Single submission: skip voting, use it directly
            single_input = room.player_inputs[0]
            logger.info(
                f"Single input from '{single_input.player_name}' in room {room_id}, "
                "skipping voting and using it directly"
            )
            # Award points to the single submitter
            room.scores[single_input.player_name] += 15
            # Mark as winning input by giving it a vote
            single_input.votes = 1
            single_input.voters = []
            room.update_activity()
            self.storage.save_room(room)
            # Note: The story will be generated when /api/turn/advance is called
        else:
            # No submissions: will continue naturally
            logger.warning(
                f"No inputs submitted in room {room_id}, will continue story naturally"
            )
            room.update_activity()
            self.storage.save_room(room)
            # Note: The natural continuation will be handled when /api/turn/advance is called



    # Story management

    def add_story_segment(self, room_id: str, content: str, winning_player: Optional[str] = None) -> None:
        """Add a story segment to history"""
        room = self.get_room(room_id)
        
        segment = StorySegment(
            turn=room.turn,
            content=content,
            winning_player=winning_player
        )
        
        room.story_history.append(segment)
        room.update_activity()
        
        self.storage.save_room(room)
        logger.info(f"Added story segment for turn {room.turn} in room {room_id}")
    
    def get_full_story(self, room_id: str) -> str:
        """Get complete story as single text"""
        room = self.get_room(room_id)
        return "\n\n".join([segment.content for segment in room.story_history])
    
    
    # Player input

    def submit_input(self, room_id: str, player_name: str, input_text: str) -> None:
        """
        Submit player's story continuation
        
        Raises:
            RoomNotFoundError: Room doesn't exist
            PlayerNotInRoomError: Player not in room
            InvalidGamePhaseError: Not in input phase
        """
        room = self.get_room(room_id)
        
        # Validate phase
        if room.phase != GamePhase.PLAYER_INPUT:
            raise InvalidGamePhaseError(
                f"Cannot submit input - current phase is {room.phase}",
                details="Inputs only accepted during PLAYER_INPUT phase"
            )

        # Check if timer has expired
        if room.is_input_phase_timed_out(settings.INPUT_TIMER_SECONDS):
            raise InvalidGamePhaseError(
                f"Cannot submit input - timer has expired",
                details="Input time limit has been reached"
            )

        # Check if player already timed out
        if player_name in room.timed_out_players:
            raise InvalidGamePhaseError(
                f"Cannot submit input - player '{player_name}' has timed out",
                details="Players who timed out cannot submit"
            )

        # Validate player
        if player_name not in room.players:
            raise PlayerNotInRoomError(
                f"Player '{player_name}' not in room {room_id}"
            )
        
        # Check if player already submitted
        existing = [inp for inp in room.player_inputs if inp.player_name == player_name]
        if existing:
            # Update existing input
            existing[0].text = input_text
            existing[0].timestamp = datetime.now()
            logger.info(f"Player '{player_name}' updated input in room {room_id}")
        else:
            # Add new input
            player_input = PlayerInput(
                player_name=player_name,
                text=input_text
            )
            room.player_inputs.append(player_input)
            logger.info(f"Player '{player_name}' submitted input in room {room_id}")
        
        room.update_activity()
        self.storage.save_room(room)
        
        # Auto-advance to voting if all players submitted
        if len(room.player_inputs) == len(room.players):
            room.phase = GamePhase.VOTING
            self.storage.save_room(room)
            logger.info(f"All players submitted - advancing to voting in room {room_id}")
    
   
   # Voting

    def cast_vote(self, room_id: str, voter: str, chosen_player: str) -> None:
        """
        Cast vote for a player's input

        Raises:
            RoomNotFoundError: Room doesn't exist
            PlayerNotInRoomError: Voter not in room
            InvalidGamePhaseError: Not in voting phase
            VotingError: Invalid vote (voting for self, player doesn't exist, etc.)
        """
        room = self.get_room(room_id)

        # Validate phase
        if room.phase != GamePhase.VOTING:
            raise InvalidGamePhaseError(
                f"Cannot vote - current phase is {room.phase}",
                details="Voting only allowed during VOTING phase"
            )

        # Validate voter
        if voter not in room.players:
            raise PlayerNotInRoomError(f"Voter '{voter}' not in room {room_id}")

        # Check if voter timed out (can't vote if you didn't submit)
        if voter in room.timed_out_players:
            raise VotingError(
                "Cannot vote - you did not submit an input during the input phase"
            )

        # Can't vote for yourself
        if voter == chosen_player:
            raise VotingError("Cannot vote for your own input")
        
        # Validate chosen player has input
        chosen_input = next(
            (inp for inp in room.player_inputs if inp.player_name == chosen_player),
            None
        )
        if not chosen_input:
            raise VotingError(
                f"Player '{chosen_player}' has no input to vote for"
            )
        
        # Remove any existing vote from this voter
        for inp in room.player_inputs:
            if hasattr(inp, 'voters'):
                if voter in inp.voters:
                    inp.voters.remove(voter)
                    inp.votes -= 1

        # Add vote
        if not hasattr(chosen_input, 'voters'):
            chosen_input.voters = []
        chosen_input.voters.append(voter)
        chosen_input.votes += 1
                    
        room.update_activity()
        self.storage.save_room(room)
        
        logger.info(f"Player '{voter}' voted for '{chosen_player}' in room {room_id}")
    
    def calculate_winner(self, room_id: str) -> VotingResultsResponse:
        """
        Calculate voting results and determine winner
        
        Returns:
            VotingResultsResponse with winner and vote counts
        """
        room = self.get_room(room_id)
        
        if not room.player_inputs:
            raise VotingError("No player inputs to vote on")
        
        # Find input with most votes
        winning_input = max(room.player_inputs, key=lambda inp: inp.votes)

        # Award points (15 points per vote)
        room.scores[winning_input.player_name] += winning_input.votes * 15
        
        # Build vote counts
        vote_counts = {
            inp.player_name: inp.votes 
            for inp in room.player_inputs
        }
        
        room.update_activity()
        self.storage.save_room(room)
        
        logger.info(f"Voting winner in room {room_id}: '{winning_input.player_name}' with {winning_input.votes} votes")
        
        return VotingResultsResponse(
            room_id=room_id,
            winning_player=winning_input.player_name,
            winning_input=winning_input.text,
            vote_counts=vote_counts
        )
    
    def get_winning_input(self, room_id: str) -> Optional[str]:
        """Get the winning input text from last voting round"""
        room = self.get_room(room_id)
        
        if not room.player_inputs:
            return None
        
        winning_input = max(room.player_inputs, key=lambda inp: inp.votes)
        return winning_input.text
   
    # Cleanup

    def cleanup_idle_rooms(self) -> int:
        """
        Clean up rooms that have been idle too long
        
        Returns:
            Number of rooms deleted
        """
        deleted = 0
        room_ids = self.list_rooms()
        
        for room_id in room_ids:
            try:
                room = self.get_room(room_id)
                if room.is_idle(settings.IDLE_TIMEOUT_MINUTES):
                    self.delete_room(room_id)
                    deleted += 1
                    logger.info(f"Cleaned up idle room {room_id}")
            except RoomNotFoundError:
                continue
        
        if deleted > 0:
            logger.info(f"Cleanup completed: {deleted} idle rooms deleted")
        
        return deleted
    
    
    # Function for generating the room id
    
    def _generate_room_id(self) -> str:
        """Generate unique 6-character room ID"""
        chars = string.ascii_uppercase + string.digits
        while True:
            room_id = ''.join(random.choices(chars, k=settings.ROOM_ID_LENGTH))
            if not self.storage.room_exists(room_id):
                return room_id