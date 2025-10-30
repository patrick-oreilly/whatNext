import string
import random
import logging
import asyncio
from typing import Optional, List, Dict
from datetime import datetime
from collections import defaultdict

from backend.core.models import (
    GameRoom, GamePhase, StoryLineType, PlayerInput,
    StorySegment, RoomStateResponse, VotingResultsResponse, LlmOutput
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

    def __init__(self, storage: Storage, story_generator=None):
        self.storage = storage
        self.story_generator = story_generator
        # Locks for preventing race conditions in critical sections
        self._room_locks: Dict[str, asyncio.Lock] = {}
        self._locks_lock = asyncio.Lock()  # Lock for accessing the locks dict
        logger.info("RoomManager initialized with race condition protection")

    async def _get_room_lock(self, room_id: str) -> asyncio.Lock:
        """
        Get or create a lock for a specific room

        This prevents race conditions when multiple clients access the same room
        simultaneously (e.g., during voting results calculation).
        """
        async with self._locks_lock:
            if room_id not in self._room_locks:
                self._room_locks[room_id] = asyncio.Lock()
            return self._room_locks[room_id]

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
            voting_phase_start_time=room.voting_phase_start_time,
            timed_out_players=room.timed_out_players,
            story_has_ended=room.story_has_ended,
            voting_timeout_seconds=settings.VOTING_TIMER_SECONDS
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
        
        # Check for duplicate name (case-insensitive)
        if player_name.lower() in [p.lower() for p in room.players]:
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

        if room.phase != GamePhase.VOTING:
            room.voting_phase_start_time = None
        
        self.storage.save_room(room)
    
    def set_phase(self, room_id: str, phase: GamePhase) -> None:
        """Set game phase"""
        room = self.get_room(room_id)
        previous_phase = room.phase
        room.phase = phase

        # Start input phase timer
        if phase == GamePhase.PLAYER_INPUT:
            room.input_phase_start_time = datetime.now()
            room.timed_out_players = []  # Reset timeout tracking

        if phase == GamePhase.VOTING:
            if not room.voting_phase_start_time:
                room.voting_phase_start_time = datetime.now()
        elif previous_phase == GamePhase.VOTING:
            room.voting_phase_start_time = None

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
        logger.info("=" * 80)
        logger.info(f"🔥 HANDLE_INPUT_TIMEOUT called for room {room_id}")
        logger.info("=" * 80)

        room = self.get_room(room_id)

        # Validate phase
        logger.info(f"📊 Current room phase: {room.phase}")
        if room.phase != GamePhase.PLAYER_INPUT:
            logger.error(f"❌ Cannot handle timeout - current phase is {room.phase}")
            raise InvalidGamePhaseError(
                f"Cannot handle timeout - current phase is {room.phase}",
                details="Timeout only applies to PLAYER_INPUT phase"
            )

        logger.info(f"✅ Phase validation passed (PLAYER_INPUT)")

        # Find players who submitted
        submitted_players = [inp.player_name for inp in room.player_inputs]
        logger.info(f"📝 Submitted players: {submitted_players}")
        logger.info(f"📝 All players in room: {room.players}")

        # Find timed out players
        logger.info(f"🔍 Checking for timed out players...")
        timed_out_count = 0
        for player in room.players:
            if player not in submitted_players:
                logger.info(f"   ⏰ Player '{player}' timed out (no submission)")
                room.timed_out_players.append(player)
                timed_out_count += 1
            else:
                logger.info(f"   ✓ Player '{player}' submitted on time")

        logger.info(f"📊 Timeout summary:")
        logger.info(f"   - Total players: {len(room.players)}")
        logger.info(f"   - Submitted: {len(submitted_players)}")
        logger.info(f"   - Timed out: {timed_out_count}")
        logger.info(f"   - Timed out players list: {room.timed_out_players}")

        # Handle based on number of submissions
        logger.info(f"🎯 Determining next action based on number of inputs: {len(room.player_inputs)}")

        if len(room.player_inputs) > 1:
            # Multiple submissions: proceed to voting
            logger.info(f"   → Path 1: MULTIPLE INPUTS ({len(room.player_inputs)}) - advancing to VOTING")
            room.phase = GamePhase.VOTING
            room.voting_phase_start_time = datetime.now()
            room.update_activity()
            self.storage.save_room(room)
            logger.info(
                f"✅ Advanced to voting with {len(room.player_inputs)} inputs in room {room_id}"
            )
            logger.info("=" * 80)
        elif len(room.player_inputs) == 1:
            # Single submission: skip voting, use it directly
            logger.info(f"   → Path 2: SINGLE INPUT - using it directly, skipping voting")
            single_input = room.player_inputs[0]
            logger.info(f"      Single submitter: '{single_input.player_name}'")
            logger.info(f"      Input text: '{single_input.text}'")
            logger.info(f"      Awarding 15 points to '{single_input.player_name}'")

            # Award points to the single submitter
            room.scores[single_input.player_name] += 15
            # Mark as winning input by giving it a vote
            single_input.votes = 1
            single_input.voters = []

            # Generate story prompt BEFORE advancing turn (so we have access to the input)
            if self.story_generator:
                logger.info(f"      Generating story prompt with single input...")
                if self.story_generator.should_end_story(room.turn, room.max_turns):
                    prompt = self.story_generator.generate_final_prompt(
                        storyline=room.storyline,
                        story_history=room.story_history,
                        winning_input=single_input.text
                    )
                    logger.info(f"      Generated FINAL story prompt")
                else:
                    prompt = self.story_generator.generate_continuation_prompt(
                        storyline=room.storyline,
                        story_history=room.story_history,
                        winning_input=single_input.text,
                        turn=room.turn + 1,  # Next turn number for prompt
                        max_turns=room.max_turns
                    )
                    logger.info(f"      Generated continuation prompt")

                room.next_prompt = prompt

            # Advance turn (like in normal voting flow)
            logger.info(f"      Advancing turn from {room.turn} to {room.turn + 1}")
            room.turn += 1
            room.player_inputs = []  # Clear inputs for next turn

            # Check if game should end
            if room.should_end_game():
                logger.info(f"      Game should end after turn {room.turn}")
                room.phase = GamePhase.GAME_OVER
            else:
                logger.info(f"      Setting phase to GENERATING_STORY")
                room.phase = GamePhase.GENERATING_STORY
            room.voting_phase_start_time = None

            room.update_activity()
            self.storage.save_room(room)
            logger.info(f"✅ Single input processed: turn advanced to {room.turn}, phase = {room.phase}")
            logger.info("=" * 80)
        else:
            # No submissions: advance turn and generate natural continuation
            logger.info(f"   → Path 3: ZERO INPUTS - all players timed out")
            logger.warning(
                f"⚠️ No inputs submitted in room {room_id}, will continue story naturally"
            )

            # Advance turn
            room.turn += 1
            room.player_inputs = []  # Clear inputs for next turn

            # Check if game should end
            if room.should_end_game():
                room.phase = GamePhase.GAME_OVER
                room.update_activity()
                self.storage.save_room(room)
                logger.info(f"Game ended in room {room_id} after {room.turn} turns")
                return

            # Generate natural continuation prompt if story_generator is available
            if self.story_generator:
                # Check if this is the final turn
                if self.story_generator.should_end_story(room.turn, room.max_turns):
                    prompt = self.story_generator.generate_natural_continuation_prompt(
                        storyline=room.storyline,
                        story_history=room.story_history,
                        turn=room.turn,
                        max_turns=room.max_turns
                    )
                    prompt += (
                        "\n\nFINAL TURN: This is the last turn. Bring the story to a "
                        "dramatic and satisfying conclusion that wraps up all major plot threads. "
                        "Make it memorable and impactful."
                    )
                else:
                    prompt = self.story_generator.generate_natural_continuation_prompt(
                        storyline=room.storyline,
                        story_history=room.story_history,
                        turn=room.turn,
                        max_turns=room.max_turns
                    )

                # Store prompt for streaming
                room.next_prompt = prompt
                logger.info(
                    f"Generated natural continuation prompt for room {room_id}, turn {room.turn}"
                )

            # Set phase to generating story
            room.phase = GamePhase.GENERATING_STORY
            room.voting_phase_start_time = None
            room.update_activity()
            self.storage.save_room(room)

            logger.info(
                f"Advanced to turn {room.turn} with natural continuation in room {room_id}"
            )

    # Story submission methods

    def add_story_segment(
        self,
        room_id: str,
        content: 'LlmOutput',
        winning_player: Optional[str] = None
    ) -> None:
        """Add a story segment to the room history"""
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

    def submit_player_input(
        self,
        room_id: str,
        player_name: str,
        input_text: str
    ) -> None:
        """
        Submit player input for current turn

        Raises:
            RoomNotFoundError: Room doesn't exist
            PlayerNotInRoomError: Player not in room
            InvalidGamePhaseError: Not in input phase
        """
        logger.info("=" * 80)
        logger.info(f"📝 SUBMIT_PLAYER_INPUT called")
        logger.info(f"   - Room: {room_id}")
        logger.info(f"   - Player: {player_name}")
        logger.info(f"   - Input text: '{input_text}'")
        logger.info(f"   - Input length: {len(input_text)}")
        logger.info("=" * 80)

        room = self.get_room(room_id)

        # Validate phase
        logger.info(f"🔍 Validating phase...")
        logger.info(f"   Current phase: {room.phase}")
        if room.phase != GamePhase.PLAYER_INPUT:
            logger.error(f"❌ Wrong phase for input submission: {room.phase}")
            raise InvalidGamePhaseError(
                f"Cannot submit input - current phase is {room.phase}",
                details="Inputs only allowed during PLAYER_INPUT phase"
            )
        logger.info(f"✅ Phase validation passed")

        # Validate player
        logger.info(f"🔍 Validating player...")
        logger.info(f"   Room players: {room.players}")
        if player_name not in room.players:
            logger.error(f"❌ Player '{player_name}' not in room")
            raise PlayerNotInRoomError(
                f"Player '{player_name}' not in room {room_id}"
            )
        logger.info(f"✅ Player validation passed")

        # Check if player already submitted
        logger.info(f"🔍 Checking for existing submission...")
        existing = next(
            (inp for inp in room.player_inputs if inp.player_name == player_name),
            None
        )

        if existing:
            # Update existing input
            logger.info(f"   ℹ️ Found existing input, UPDATING")
            logger.info(f"   Old text: '{existing.text}'")
            logger.info(f"   New text: '{input_text}'")
            existing.text = input_text
            logger.info(f"✅ Player '{player_name}' updated input in room {room_id}")
        else:
            # Add new input
            logger.info(f"   ℹ️ No existing input, CREATING NEW")
            player_input = PlayerInput(
                player_name=player_name,
                text=input_text,
                votes=0
            )
            room.player_inputs.append(player_input)
            logger.info(f"✅ Player '{player_name}' submitted NEW input in room {room_id}")

        # Check if all players have submitted
        logger.info(f"🔍 Checking if all players submitted...")
        logger.info(f"   Total players: {len(room.players)}")
        logger.info(f"   Submitted inputs: {len(room.player_inputs)}")
        logger.info(f"   Players with inputs: {[inp.player_name for inp in room.player_inputs]}")

        if len(room.player_inputs) == len(room.players):
            # All players submitted - automatically advance to voting
            logger.info(f"🎉 ALL PLAYERS SUBMITTED!")
            logger.info(f"   → Automatically advancing to VOTING phase")
            room.phase = GamePhase.VOTING
            room.voting_phase_start_time = datetime.now()
            logger.info(
                f"✅ All players submitted in room {room_id} - automatically advancing to VOTING phase"
            )
        else:
            logger.info(f"   → Still waiting for {len(room.players) - len(room.player_inputs)} player(s)")

        room.update_activity()
        self.storage.save_room(room)
        logger.info("=" * 80)

    def submit_input(
        self,
        room_id: str,
        player_name: str,
        input_text: str
    ) -> None:
        """Alias for submit_player_input for API compatibility"""
        return self.submit_player_input(room_id, player_name, input_text)

    # Voting methods

    def record_vote(
        self,
        room_id: str,
        voter: str,
        chosen_player: str
    ) -> None:
        """
        Record a vote for a player's input

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

    def cast_vote(
        self,
        room_id: str,
        voter: str,
        chosen_player: str
    ) -> None:
        """Alias for record_vote for API compatibility"""
        return self.record_vote(room_id, voter, chosen_player)

    async def calculate_winner(self, room_id: str) -> VotingResultsResponse:
        """
        Calculate voting results and determine winner

        Awards points to ALL players based on votes received (15 points per vote).
        Uses idempotent logic to prevent awarding points multiple times.
        Handles ties with random selection.

        THREAD-SAFE: Uses asyncio.Lock to prevent race conditions when
        multiple clients call this simultaneously.

        Returns:
            VotingResultsResponse with winner, vote counts, and tie information
        """
        # 🔒 CRITICAL SECTION: Acquire lock to prevent race conditions
        lock = await self._get_room_lock(room_id)
        async with lock:
            logger.debug(f"🔒 Acquired lock for calculate_winner in room {room_id}")

            room = self.get_room(room_id)

            if not room.player_inputs:
                raise VotingError("No player inputs to vote on")

            # Find all inputs with most votes (for tie detection)
            max_votes = max(inp.votes for inp in room.player_inputs)
            tied_inputs = [inp for inp in room.player_inputs if inp.votes == max_votes]

            # Handle ties with random selection
            winning_input = random.choice(tied_inputs)

            was_tie = len(tied_inputs) > 1
            tied_player_names = [inp.player_name for inp in tied_inputs]

            if was_tie:
                logger.info(
                    f"🎲 Tie detected in room {room_id}: {len(tied_inputs)} players with {max_votes} votes. "
                    f"Players: {tied_player_names}. Randomly selected '{winning_input.player_name}' as winner."
                )

            # Build vote counts
            vote_counts = {
                inp.player_name: inp.votes
                for inp in room.player_inputs
            }

            # 🛡️ IDEMPOTENT LOGIC: Check if points have already been awarded this turn
            # This prevents multiple clients from awarding points multiple times
            if room.points_awarded_turn is None or room.points_awarded_turn != room.turn:
                logger.info(f"💰 Awarding points for turn {room.turn} in room {room_id}")

                # Award points to ALL players based on votes received (15 points per vote)
                for inp in room.player_inputs:
                    points_earned = inp.votes * 15

                    # Ensure player exists in scores dict
                    if inp.player_name not in room.scores:
                        room.scores[inp.player_name] = 0

                    room.scores[inp.player_name] += points_earned

                    if points_earned > 0:
                        logger.info(
                            f"  ✅ Awarded {points_earned} points to '{inp.player_name}' "
                            f"({inp.votes} votes × 15 points)"
                        )
                    else:
                        logger.debug(f"  ⚪ '{inp.player_name}' received 0 votes, no points awarded")

                # Mark that points have been awarded for this turn
                room.points_awarded_turn = room.turn

                logger.info(f"✅ Points awarded for turn {room.turn} in room {room_id}")
            else:
                logger.warning(
                    f"⚠️  Points already awarded for turn {room.turn} in room {room_id}, skipping. "
                    f"This is expected if multiple clients called this endpoint."
                )

            room.update_activity()
            self.storage.save_room(room)

            logger.info(
                f"🏆 Voting winner in room {room_id}: '{winning_input.player_name}' "
                f"with {winning_input.votes} votes"
            )

            logger.debug(f"🔓 Releasing lock for calculate_winner in room {room_id}")

            return VotingResultsResponse(
                room_id=room_id,
                winning_player=winning_input.player_name,
                winning_input=winning_input.text,
                vote_counts=vote_counts,
                was_tie=was_tie,
                tied_players=tied_player_names
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
