import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from google.adk.runners import InMemoryRunner
from google.adk.agents.run_config import RunConfig
from google.genai.types import Part, Content

from backend.core.models import (
    CreateRoomRequest, JoinRoomRequest, SubmitInputRequest,
    CastVoteRequest, RoomCreatedResponse, JoinRoomResponse,
    HealthResponse, GamePhase
)
from backend.game_management.room_manager import RoomManager
from backend.session_management.session_manager import SessionManager
from backend.game_management.story_generator import StoryGenerator
from backend.core.storage import create_storage
from backend.core.errors import register_exception_handlers
from backend.core.config import settings
from backend.agent.agent import root_agent

import os
import uuid

# Generate unique instance ID to track multi-instance issues
INSTANCE_ID = os.getenv("INSTANCE_ID", str(uuid.uuid4())[:8])

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format=f'[{INSTANCE_ID}] %(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global managers

storage = create_storage(settings.STORAGE_TYPE)
story_generator = StoryGenerator()
room_manager = RoomManager(storage, story_generator)
session_manager = SessionManager()

# Background tasks

async def cleanup_task():
    """Background task to cleanup idle rooms"""
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes
            deleted = room_manager.cleanup_idle_rooms()
            if deleted > 0:
                logger.info(f"Background cleanup: removed {deleted} idle rooms")
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}")

# App lifecycle

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    logger.info("=" * 60)
    logger.info("What's Next - Game Master API Starting")
    logger.info("=" * 60)
    
    # Validate configuration
    try:
        settings.validate()
        logger.info("Configuration validated")
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        raise
    
    # Start background cleanup task
    cleanup_task_handle = asyncio.create_task(cleanup_task())
    logger.info("Background cleanup task started")
    
    logger.info(f"Server ready on {settings.HOST}:{settings.PORT}")
    logger.info("=" * 60)
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    cleanup_task_handle.cancel()
    
    # Close all active sessions
    for room_id in list(session_manager.sessions.keys()):
        session_manager.close_session(room_id)
    
    logger.info("Shutdown complete")

#FastAPI app
app = FastAPI(
    title="Whas Next - Game Master API",
    description="AI-powered collaborative storytelling game backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom exception handlers
register_exception_handlers(app)

# Health and status endpoints

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        api_configured=bool(settings.GOOGLE_API_KEY),
        active_rooms=len(room_manager.list_rooms())
    )

@app.get("/health", response_model=HealthResponse)
async def health():
    """Detailed health check"""
    return HealthResponse(
        status="healthy",
        api_configured=bool(settings.GOOGLE_API_KEY),
        active_rooms=len(room_manager.list_rooms())
    )

@app.get("/rooms")
async def list_rooms():
    """List all active room IDs"""
    return {
        "rooms": room_manager.list_rooms(),
        "count": len(room_manager.list_rooms())
    }

# Room management end points

@app.post("/api/rooms/create", response_model=RoomCreatedResponse)
async def create_room(request: CreateRoomRequest):
    """
    Create a new game room
    
    Returns room_id that players use to join
    """
    room_id = room_manager.create_room(
        storyline=request.storyline,
        max_turns=request.max_turns
    )
    
    logger.info(f"Created room {room_id} with storyline {request.storyline}")
    
    return RoomCreatedResponse(
        room_id=room_id,
        storyline=request.storyline.value
    )

@app.post("/api/rooms/join", response_model=JoinRoomResponse)
async def join_room(request: JoinRoomRequest):
    """
    Add player to existing room

    Validates:
    - Room exists
    - Room not full
    - Game hasn't started
    - Player name not taken
    """
    logger.info(f"[JOIN REQUEST] Room: {request.room_id}, Player: {request.player_name}, Available rooms: {room_manager.list_rooms()}")

    room_manager.add_player(request.room_id, request.player_name)

    room = room_manager.get_room(request.room_id)

    logger.info(f"Player '{request.player_name}' joined room {request.room_id}")

    return JoinRoomResponse(
        room_id=request.room_id,
        players=room.players
    )

@app.post("/api/rooms/{room_id}/start")
async def start_game(room_id: str):
    """
    Start the game

    Creates ADK session and prepares initial prompt
    """
    # Validate and start game
    room_manager.start_game(room_id)

    # Get room
    room = room_manager.get_room(room_id)

    # Create ADK session
    session_info = await session_manager.create_session(
        room_id=room_id,
        agent=root_agent,
        user_id=room_id
    )

    # Store initial prompt for first stream
    initial_message = story_generator.get_storyline_prompt(room.storyline)
    room.next_prompt = initial_message
    room_manager.storage.save_room(room)

    logger.info(f"Game started in room {room_id}")

    return {
        "status": "started",
        "room_id": room_id,
        "session_id": session_info.session.id,
        "turn": 1,
        "phase": GamePhase.GENERATING_STORY
    }

@app.get("/api/rooms/{room_id}/state")
async def get_room_state(room_id: str):
    """
    Get current state of room

    Returns:
    - Players
    - Scores
    - Current turn
    - Game phase
    - Story history
    - Player inputs (if in voting phase)
    """
    return room_manager.get_room_state(room_id)

@app.get("/api/rooms/{room_id}/timer")
async def get_input_timer(room_id: str):
    """
    Get current input phase timer status

    Returns:
    - time_remaining: Seconds remaining in input phase
    - has_timed_out: Whether phase has timed out
    - submitted_count: Number of players who submitted
    - total_players: Total number of players
    - timed_out_players: List of players who timed out
    """
    room = room_manager.get_room(room_id)

    if room.phase != GamePhase.PLAYER_INPUT:
        return {
            "active": False,
            "message": "Input phase not active"
        }

    time_remaining = room.get_input_time_remaining(settings.INPUT_TIMER_SECONDS)
    has_timed_out = room.is_input_phase_timed_out(settings.INPUT_TIMER_SECONDS)

    return {
        "active": True,
        "time_remaining": time_remaining,
        "has_timed_out": has_timed_out,
        "timeout_seconds": settings.INPUT_TIMER_SECONDS,
        "submitted_count": len(room.player_inputs),
        "total_players": len(room.players),
        "timed_out_players": room.timed_out_players
    }

@app.post("/api/rooms/{room_id}/timeout")
async def trigger_input_timeout(room_id: str):
    """
    Manually trigger input phase timeout

    Used when timer expires on client side
    """
    logger.info("=" * 80)
    logger.info(f"🔥 TIMEOUT ENDPOINT CALLED for room {room_id}")
    logger.info("=" * 80)

    try:
        room = room_manager.get_room(room_id)
        logger.info(f"📊 Room state BEFORE timeout handling:")
        logger.info(f"   - Phase: {room.phase}")
        logger.info(f"   - Players: {room.players}")
        logger.info(f"   - Player inputs count: {len(room.player_inputs)}")
        logger.info(f"   - Player inputs: {[inp.player_name for inp in room.player_inputs]}")
        logger.info(f"   - Timed out players: {room.timed_out_players}")

        logger.info(f"🎯 Calling room_manager.handle_input_timeout('{room_id}')...")
        room_manager.handle_input_timeout(room_id)
        logger.info(f"✅ handle_input_timeout completed")

        # Get updated room state
        room = room_manager.get_room(room_id)
        logger.info(f"📊 Room state AFTER timeout handling:")
        logger.info(f"   - Phase: {room.phase}")
        logger.info(f"   - Player inputs count: {len(room.player_inputs)}")
        logger.info(f"   - Timed out players: {room.timed_out_players}")

        result = {
            "status": "timeout_handled",
            "room_id": room_id,
            "phase": room.phase
        }
        logger.info(f"📤 Returning response: {result}")
        logger.info("=" * 80)

        return result

    except Exception as e:
        logger.error(f"❌ ERROR in timeout endpoint: {e}", exc_info=True)
        raise

@app.delete("/api/rooms/{room_id}")
async def delete_room(room_id: str):
    """Delete a room and close its session"""
    # Close ADK session
    session_manager.close_session(room_id)
    
    # Delete room
    room_manager.delete_room(room_id)
    
    logger.info(f"Deleted room {room_id}")
    
    return {"status": "deleted", "room_id": room_id}

# Gameplay endpoints
@app.post("/api/input/submit")
async def submit_input(request: SubmitInputRequest):
    """
    Submit player's story continuation idea
    
    Phase: PLAYER_INPUT
    
    Validates:
    - Room exists
    - Player in room
    - Correct phase
    
    Auto-advances to VOTING when all players submit
    """
    room_manager.submit_input(
        room_id=request.room_id,
        player_name=request.player_name,
        input_text=request.input_text
    )
    
    room = room_manager.get_room(request.room_id)
    
    logger.info(f"Player '{request.player_name}' submitted input in room {request.room_id}")
    
    return {
        "status": "submitted",
        "submissions": len(room.player_inputs),
        "total_players": len(room.players),
        "phase": room.phase
    }

@app.post("/api/voting/cast")
async def cast_vote(request: CastVoteRequest):
    """
    Cast vote for favorite story continuation
    
    Phase: VOTING
    
    Validates:
    - Room exists
    - Voter in room
    - Correct phase
    - Not voting for self
    - Chosen player has input
    """
    room_manager.cast_vote(
        room_id=request.room_id,
        voter=request.voter,
        chosen_player=request.chosen_player
    )
    
    logger.info(f"Player '{request.voter}' voted for '{request.chosen_player}' in room {request.room_id}")
    
    return {"status": "voted"}

@app.get("/api/voting/results/{room_id}")
async def get_voting_results(room_id: str):
    """
    Calculate and return voting results
    
    Determines winner, updates scores
    """
    results = room_manager.calculate_winner(room_id)
    
    logger.info(f"Voting results calculated for room {room_id}: winner is '{results.winning_player}'")
    
    return results

@app.post("/api/turn/advance/{room_id}")
async def advance_turn(room_id: str):
    """
    Advance to next turn

    Handles three cases:
    - Multiple inputs: Use winning input from voting
    - Single input: Use that input directly (voting was skipped)
    - No inputs: Generate natural continuation
    """
    room = room_manager.get_room(room_id)

    # Determine if we have inputs and get winning input
    winning_input = None
    if len(room.player_inputs) > 0:
        winning_input = room_manager.get_winning_input(room_id)

    # Advance turn
    room_manager.advance_turn(room_id)

    room = room_manager.get_room(room_id)

    # Check if game should end
    if room.phase == GamePhase.GAME_OVER:
        # Close ADK session
        session_manager.close_session(room_id)

        logger.info(f"Game ended in room {room_id}")

        return {
            "status": "game_over",
            "turn": room.turn,
            "final_scores": room.scores
        }

    # Generate continuation prompt based on situation
    if winning_input:
        # Case 1 & 2: We have a winning input (either from voting or single submission)
        if story_generator.should_end_story(room.turn, room.max_turns):
            prompt = story_generator.generate_final_prompt(
                storyline=room.storyline,
                story_history=room.story_history,
                winning_input=winning_input
            )
        else:
            prompt = story_generator.generate_continuation_prompt(
                storyline=room.storyline,
                story_history=room.story_history,
                winning_input=winning_input,
                turn=room.turn,
                max_turns=room.max_turns
            )
        logger.info(f"Generated continuation prompt with player input for room {room_id}")
    else:
        # Case 3: No inputs submitted - continue naturally
        if story_generator.should_end_story(room.turn, room.max_turns):
            # For final turn, still need natural continuation
            prompt = story_generator.generate_natural_continuation_prompt(
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
            prompt = story_generator.generate_natural_continuation_prompt(
                storyline=room.storyline,
                story_history=room.story_history,
                turn=room.turn,
                max_turns=room.max_turns
            )
        logger.info(f"Generated natural continuation prompt (no player inputs) for room {room_id}")

    # Store prompt for next stream call
    room.next_prompt = prompt
    room_manager.storage.save_room(room)

    # Set phase to GENERATING_STORY
    room_manager.set_phase(room_id, GamePhase.GENERATING_STORY)

    logger.info(f"Advanced to turn {room.turn} in room {room_id}")

    return {
        "status": "turn_advanced",
        "turn": room.turn,
        "phase": GamePhase.GENERATING_STORY
    }



# Track active streams to prevent concurrent access to same session
active_streams = {}
active_streams_lock = asyncio.Lock()

@app.get("/api/story/stream/{room_id}")
async def stream_story(room_id: str):
    """
    Stream AI-generated story content 
    
    Uses proper ADK streaming with live_events
    """
    room = room_manager.get_room(room_id)
    
    # Create turn-specific cache key
    stream_key = f"{room_id}_turn_{room.turn}"
    
    # Check if stream is already active for this specific turn
    async with active_streams_lock:
        if stream_key in active_streams:
            logger.warning(
                f"Stream already active for room {room_id} turn {room.turn}, "
                "replaying cached response"
            )
            # Return cached response if available
            if "response" in active_streams[stream_key]:
                async def replay_generator():
                    cached = active_streams[stream_key]["response"]
                    for chunk in cached:
                        yield f"data: {chunk}\n\n"
                        await asyncio.sleep(0.01)
                    yield "data: [DONE]\n\n"

                return StreamingResponse(
                    replay_generator(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no",
                    }
                )
        
        # Mark stream as active for this turn
        active_streams[stream_key] = {"response": []}

    async def event_generator():
        """Generate Server-Sent Events from ADK"""
        try:
            full_response = ""
            chunks = []

            # Get the prepared prompt from room
            room = room_manager.get_room(room_id)

            if not room.next_prompt:
                logger.error(f"No prompt prepared for room {room_id}")
                yield "data: [ERROR] No prompt prepared\n\n"
                return

            message = room.next_prompt

            # Stream response
            async for chunk in session_manager.stream_response(room_id, message):
                full_response += chunk
                chunks.append(chunk)

                # Send chunk to client in SSE format
                yield f"data: {chunk}\n\n"

                # Small delay for smooth streaming
                await asyncio.sleep(0.01)
            
            # Store cached chunks for late joiners
            async with active_streams_lock:
                if stream_key in active_streams:
                    active_streams[stream_key]["response"] = chunks

            # Clear the prompt after use
            room = room_manager.get_room(room_id)
            room.next_prompt = None
            room_manager.storage.save_room(room)

            # Store complete story segment
            room_manager.add_story_segment(
                room_id=room_id,
                content=full_response,
                winning_player=None
            )
            
            # Update room phase
            room = room_manager.get_room(room_id)
            
            if room.turn == 1:
                # After opening, move to player input
                room_manager.set_phase(room_id, GamePhase.PLAYER_INPUT)
            else:
                # After continuation, move to player input for next turn
                room_manager.set_phase(room_id, GamePhase.PLAYER_INPUT)
            
            # Signal completion
            yield "data: [DONE]\n\n"
            
            logger.info(
                f"Story streaming completed for room {room_id}, turn {room.turn}"
            )
            
        except Exception as e:
            logger.error(f"Error streaming story for room {room_id}: {e}")
            yield f"data: [ERROR] {str(e)}\n\n"
            
        finally:
            # Clean up after a delay to allow late joiners
            await asyncio.sleep(5)
            async with active_streams_lock:
                if stream_key in active_streams:
                    del active_streams[stream_key]
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

# UTILITY ENDPOINTS

@app.get("/api/sessions/active")
async def get_active_sessions():
    """Get information about active ADK sessions"""
    sessions = session_manager.get_active_sessions()

    return {
        "count": len(sessions),
        "sessions": [
            {
                "room_id": session.room_id,
                "session_id": session.session.id,
                "message_count": session.message_count,
                "created_at": session.created_at.isoformat()
            }
            for session in sessions.values()
        ]
    }

@app.post("/api/cleanup/run")
async def trigger_cleanup():
    """Manually trigger room cleanup"""
    deleted = room_manager.cleanup_idle_rooms()
    
    return {
        "status": "complete",
        "rooms_deleted": deleted
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower()
    )