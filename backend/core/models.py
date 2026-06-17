from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum


class LlmOutput(BaseModel):
    paragraph: str = Field(
        description="A vivid, narrative paragraph describing the play (1-3 sentences)."
    )
    status: Optional[str] = Field(
        default=None,
        description="Current game status update (e.g., 'Momentum swinging', 'Lead extended', 'Timeout called'). Null if story has ended."
    )
    decision: Optional[str] = Field(
        default=None,
        description="The player's next decision prompt (e.g., 'Press full-court or drop back?'). Null if story has ended."
    )
    has_story_ended: bool = Field(
        default=False,
        description="True if the game has ended."
    )
    ending_summary: Optional[str] = Field(
        default=None,
        description="A summary of the story's ending. Only provided when has_story_ended is True."
    )

# ENUM data models

class GamePhase(str, Enum):
    """Game state phases"""
    LOBBY = "lobby"
    GENERATING_STORY = "generating_story"
    PLAYER_INPUT = "player_input"
    VOTING = "voting"
    GAME_OVER = "game_over"



class StoryLineType(str, Enum):
    """Available story lines"""
    HOOP_DREAMS = "hoop_dreams"
    SPACE_EXPLORATION = "space_exploration"
    CASINO_HEIST = "casino_heist"
    HAUNTED_MANSION = "haunted_mansion"
    SUNFLOWER_WEST = "sunflower_west"
    CUSTOM_STORYLINE = "custom_storyline"

    

# Game state models

class PlayerInput(BaseModel):
    """A player's story continuation suggestion"""
    player_name: str
    text: str
    votes: int = 0
    voters: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.now)


class StorySegment(BaseModel):
    """A segment of the story"""
    turn: int
    content: LlmOutput
    winning_player: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class GameRoom(BaseModel):
    """Complete game room state"""
    room_id: str
    storyline: StoryLineType
    players: List[str] = []
    scores: Dict[str, int] = {}
    player_tokens: Dict[str, str] = {}
    host_token: Optional[str] = None  # Token of the host (first joiner; succeeds to players[0] on leave)
    turn: int = 0
    phase: GamePhase = GamePhase.LOBBY
    story_history: List[StorySegment] = []
    player_inputs: List[PlayerInput] = []
    last_activity: datetime = Field(default_factory=datetime.now)
    created_at: datetime = Field(default_factory=datetime.now)
    max_turns: int = 10
    input_phase_start_time: Optional[datetime] = None  # Track when input phase started
    timed_out_players: List[str] = []  # Track players who timed out
    next_prompt: Optional[str] = None  # Prompt for next AI generation
    story_has_ended: bool = False  # Flag indicating AI generated [END] marker
    points_awarded_turn: Optional[int] = None  # NEW: Track which turn had points awarded
    voting_phase_start_time: Optional[datetime] = None  # Track when voting phase started
    winning_player: Optional[str] = None  # Resolved winner for winner_resolved_turn
    winner_resolved_turn: Optional[int] = None  # Turn the winner was last resolved for

    class Config:
        use_enum_values = True

    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.now()

    def is_full(self, max_players: int) -> bool:
        """Check if a room is at max capacity"""
        return len(self.players) >= max_players

    def can_start(self, min_players:int) -> bool:
        """Check if a room has enough players to start"""
        return len(self.players) >= min_players

    def is_idle(self, timeout_mins: int) -> bool:
        """Check if a room has been idle too long"""
        idle_time = (datetime.now() - self.last_activity).total_seconds() / 60
        return idle_time > timeout_mins

    def should_end_game(self) -> bool:
        """Check if the game should end"""
        return self.turn > self.max_turns

    def is_input_phase_timed_out(self, timeout_seconds: int) -> bool:
        """Check if input phase has exceeded timeout"""
        if not self.input_phase_start_time:
            return False
        elapsed = (datetime.now() - self.input_phase_start_time).total_seconds()
        return elapsed >= timeout_seconds

    def get_input_time_remaining(self, timeout_seconds: int) -> float:
        """Get remaining time in input phase (seconds)"""
        if not self.input_phase_start_time:
            return timeout_seconds
        elapsed = (datetime.now() - self.input_phase_start_time).total_seconds()
        remaining = timeout_seconds - elapsed
        return max(0, remaining)

    def is_voting_phase_timed_out(self, timeout_seconds: int) -> bool:
        """Check if voting phase has exceeded timeout"""
        if not self.voting_phase_start_time:
            return False
        elapsed = (datetime.now() - self.voting_phase_start_time).total_seconds()
        return elapsed >= timeout_seconds

    def get_voting_time_remaining(self, timeout_seconds: int) -> float:
        """Get remaining time in voting phase (seconds)"""
        if not self.voting_phase_start_time:
            return timeout_seconds
        elapsed = (datetime.now() - self.voting_phase_start_time).total_seconds()
        remaining = timeout_seconds - elapsed
        return max(0, remaining)
    
# API REQUEST MODELS

class CreateRoomRequest(BaseModel):
    """Request to create a new game room"""
    storyline: StoryLineType = StoryLineType.HOOP_DREAMS
    max_turns: int = Field(default=10, ge=5,le=20)

class JoinRoomRequest(BaseModel):
    """Request to join an existing room"""
    room_id: str = Field(..., min_length=6, max_length=6)
    player_name: str = Field(...,min_length=1, max_length=20)

class StartGameRequest(BaseModel):
    """Request to start the game"""
    room_id: str

class SubmitInputRequest(BaseModel):
    """Request to sumbit a story continuation"""
    room_id: str
    player_name: str
    input_text: str = Field(..., min_length=3, max_length=500)
    player_token: Optional[str] = Field(default=None)

class CastVoteRequest(BaseModel):
    """Request to vote for a story continuation"""
    room_id: str
    voter: str
    chosen_player: str
    player_token: Optional[str] = Field(default=None)

# API RESPONSE MODELS

class RoomCreatedResponse(BaseModel):
    """Response after creating a room"""
    room_id: str
    storyline: str
    status: str = "created"

class RoomStateResponse(BaseModel):
    """Current state of a game room"""
    room_id: str
    storyline: StoryLineType
    players: List[str]
    scores: Dict[str, int]
    turn: int
    phase: GamePhase
    story_history: List[StorySegment]
    player_inputs: List[PlayerInput]
    max_turns: int
    input_phase_start_time: Optional[datetime] = None
    voting_phase_start_time: Optional[datetime] = None
    timed_out_players: List[str] = []
    story_has_ended: bool = False
    voting_timeout_seconds: Optional[int] = None
    input_timeout_seconds: Optional[int] = None

    class Config:
        use_enum_values = True  


class JoinRoomResponse(BaseModel):
    """Response after joining a game"""
    room_id: str
    players: List[str]
    status: str = "joined"
    player_token: str = ""

class VotingResultsResponse(BaseModel):
    """Results of the voting phase"""

    room_id: str
    winning_player: str
    winning_input: str
    vote_counts: Dict[str, int]
    was_tie: bool = False  # NEW: Was there a tie?
    tied_players: List[str] = []  # NEW: Which players tied?

class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    message: str
    details: Optional[str] = None

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    api_configured: bool
    active_rooms: int
    timestamp: datetime = Field(default_factory=datetime.now)


class TurnDirective(str, Enum):
    """Directives returned by GameTurn methods for the API layer to execute"""
    NONE = "none"
    DISPOSE_SESSION = "dispose_session"
    CREATE_SESSION = "create_session"


class TurnResult(BaseModel):
    """Result of a game turn operation with directives for the API layer"""
    success: bool = True
    directive: TurnDirective = TurnDirective.NONE
    response: dict = {}
    phase: Optional[GamePhase] = None
    error: Optional[str] = None

    
