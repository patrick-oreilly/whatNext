from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum

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
    content: str
    winning_player: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class GameRoom(BaseModel):
    """Complete game room state"""
    room_id: str
    storyline: StoryLineType
    players: List[str] = []
    scores: Dict[str, int] = {}
    turn: int = 0
    phase: GamePhase = GamePhase.LOBBY
    story_history: List[StorySegment] = []
    player_inputs: List[PlayerInput] = []
    last_activity: datetime = Field(default_factory=datetime.now)
    created_at: datetime = Field(default_factory=datetime.now)
    max_turns: int = 10

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
        return self.turn >= self.max_turns
    
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
    input_text: str = Field(..., min_length=10, max_length=500)

class CastVoteRequest(BaseModel):
    """Request to vote for a story continuation"""
    room_id: str
    voter: str
    chosen_player: str

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

    class Config:
        use_enum_values = True  


class JoinRoomResponse(BaseModel):
    """Response after joining a game"""
    room_id: str
    players: List[str]
    status: str = "joined"

class VotingResultsResponse(BaseModel):
    """Results of the voting phase"""

    room_id: str
    winning_player: str
    winning_input: str
    vote_counts: Dict[str, int]

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

    
