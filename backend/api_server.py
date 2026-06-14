import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.core.models import (
    CreateRoomRequest, JoinRoomRequest, SubmitInputRequest,
    CastVoteRequest, RoomCreatedResponse, JoinRoomResponse,
    HealthResponse, TurnDirective
)
from backend.game_management.room_manager import RoomManager
from backend.game_management.game_turn import GameTurn
from backend.session_management.session_manager import SessionManager
from backend.game_management.story_generator import StoryGenerator
from backend.core.storage import create_storage
from backend.core.errors import register_exception_handlers
from backend.core.config import settings
from backend.agent.agent import root_agent

import os
import uuid

INSTANCE_ID = os.getenv("INSTANCE_ID", str(uuid.uuid4())[:8])

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format=f'[{INSTANCE_ID}] %(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

storage = create_storage(settings.STORAGE_TYPE)
story_generator = StoryGenerator()
room_manager = RoomManager(storage)
session_manager = SessionManager()
game_turn = GameTurn(room_manager, session_manager, story_generator)


async def cleanup_task():
    while True:
        try:
            await asyncio.sleep(300)
            deleted = room_manager.cleanup_idle_rooms()
            if deleted > 0:
                logger.info(f"Background cleanup: removed {deleted} idle rooms")
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("What's Next - Game Master API Starting")
    logger.info("=" * 60)

    try:
        settings.validate()
        logger.info("Configuration validated")
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        raise

    cleanup_task_handle = asyncio.create_task(cleanup_task())
    logger.info("Background cleanup task started")
    logger.info(f"Server ready on {settings.HOST}:{settings.PORT}")
    logger.info("=" * 60)

    yield

    logger.info("Shutting down...")
    cleanup_task_handle.cancel()
    for room_id in list(session_manager.sessions.keys()):
        session_manager.close_session(room_id)
    logger.info("Shutdown complete")


app = FastAPI(
    title="What's Next - Game Master API",
    description="AI-powered collaborative storytelling game backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)


def _consume_directives(result, room_id: str = ""):
    """Execute any side effects required by TurnResult directives."""
    if result.directive == TurnDirective.DISPOSE_SESSION:
        session_manager.close_session(room_id)


# ------------------------------------------------------------------
# Health and status endpoints
# ------------------------------------------------------------------

@app.get("/", response_model=HealthResponse)
async def root():
    return HealthResponse(
        status="healthy",
        api_configured=bool(settings.GOOGLE_API_KEY),
        active_rooms=len(room_manager.list_rooms())
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        api_configured=bool(settings.GOOGLE_API_KEY),
        active_rooms=len(room_manager.list_rooms())
    )


@app.get("/rooms")
async def list_rooms():
    return {
        "rooms": room_manager.list_rooms(),
        "count": len(room_manager.list_rooms())
    }


# ------------------------------------------------------------------
# Room management endpoints
# ------------------------------------------------------------------

@app.post("/api/rooms/create", response_model=RoomCreatedResponse)
async def create_room(request: CreateRoomRequest):
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
    logger.info(f"[JOIN REQUEST] Room: {request.room_id}, Player: {request.player_name}")
    room_manager.add_player(request.room_id, request.player_name)
    room = room_manager.get_room(request.room_id)
    logger.info(f"Player '{request.player_name}' joined room {request.room_id}")
    return JoinRoomResponse(
        room_id=request.room_id,
        players=room.players
    )


@app.post("/api/rooms/{room_id}/start")
async def start_game(room_id: str):
    result = game_turn.start_game(room_id)

    if result.directive == TurnDirective.CREATE_SESSION:
        session_info = await session_manager.create_session(
            room_id=room_id,
            agent=root_agent,
            user_id=room_id
        )
        result.response["session_id"] = session_info.session.id

    return result.response


@app.get("/api/rooms/{room_id}/state")
async def get_room_state(room_id: str):
    result = game_turn.get_room_state(room_id)
    return result.response


@app.get("/api/rooms/{room_id}/timer")
async def get_input_timer(room_id: str):
    result = game_turn.get_input_timer(room_id)
    return result.response


@app.post("/api/rooms/{room_id}/timeout")
async def trigger_input_timeout(room_id: str):
    logger.info(f"Input timeout triggered for room {room_id}")
    result = game_turn.handle_input_timeout(room_id)
    return result.response


@app.get("/api/voting/{room_id}/timer")
async def get_voting_timer(room_id: str):
    result = game_turn.get_voting_timer(room_id)
    return result.response


@app.delete("/api/rooms/{room_id}")
async def delete_room(room_id: str):
    session_manager.close_session(room_id)
    room_manager.delete_room(room_id)
    logger.info(f"Deleted room {room_id}")
    return {"status": "deleted", "room_id": room_id}


# ------------------------------------------------------------------
# Gameplay endpoints
# ------------------------------------------------------------------

@app.post("/api/input/submit")
async def submit_input(request: SubmitInputRequest):
    result = game_turn.submit_input(
        room_id=request.room_id,
        player_name=request.player_name,
        input_text=request.input_text
    )
    logger.info(f"Player '{request.player_name}' submitted input in room {request.room_id}")
    return result.response


@app.post("/api/voting/cast")
async def cast_vote(request: CastVoteRequest):
    result = game_turn.cast_vote(
        room_id=request.room_id,
        voter=request.voter,
        chosen_player=request.chosen_player
    )
    logger.info(f"Player '{request.voter}' voted for '{request.chosen_player}' in room {request.room_id}")
    return result.response


@app.get("/api/voting/results/{room_id}")
async def get_voting_results(room_id: str):
    result = await game_turn.resolve_voting(room_id)
    logger.info(f"Voting results calculated for room {room_id}")
    return result.response


@app.post("/api/voting/{room_id}/timeout")
async def trigger_voting_timeout(room_id: str):
    result = await game_turn.handle_voting_timeout(room_id)
    logger.info(f"Voting timeout handled in room {room_id}")
    return result.response


@app.post("/api/turn/advance/{room_id}")
async def advance_turn(room_id: str):
    result = game_turn.advance_turn(room_id)
    _consume_directives(result, room_id)
    return result.response


# ------------------------------------------------------------------
# Story streaming
# ------------------------------------------------------------------

active_streams = {}
active_streams_lock = asyncio.Lock()


@app.get("/api/story/stream/{room_id}")
async def stream_story(room_id: str):
    room = room_manager.get_room(room_id)
    stream_key = f"{room_id}_turn_{room.turn}"

    async with active_streams_lock:
        if stream_key in active_streams:
            logger.warning(
                f"Stream already active for room {room_id} turn {room.turn}, "
                "replaying cached response"
            )
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
        active_streams[stream_key] = {"response": []}

    async def event_generator():
        try:
            full_response = ""
            paragraph_chunks = []

            room = room_manager.get_room(room_id)

            if not room.next_prompt:
                yield "data: [ERROR] No prompt prepared\n\n"
                return

            message = room.next_prompt

            logger.info(f"Collecting structured response from ADK for room {room_id}")
            async for chunk in session_manager.stream_response(room_id, message):
                full_response += chunk

            logger.info(f"Complete response received (length={len(full_response)})")

            result = game_turn.process_llm_result(room_id, full_response)

            room = room_manager.get_room(room_id)
            if room.story_history:
                paragraph_text = room.story_history[-1].content.paragraph
                chunk_size = 15
                for i in range(0, len(paragraph_text), chunk_size):
                    chunk = paragraph_text[i:i + chunk_size]
                    paragraph_chunks.append(chunk)
                    yield f"data: {chunk}\n\n"
                    await asyncio.sleep(0.02)

            async with active_streams_lock:
                if stream_key in active_streams:
                    active_streams[stream_key]["response"] = paragraph_chunks

            _consume_directives(result, room_id)

            yield "data: [DONE]\n\n"

            logger.info(f"Story streaming completed for room {room_id}, turn {room.turn}")

        except Exception as e:
            logger.error(f"Error streaming story for room {room_id}: {e}")
            yield f"data: [ERROR] {str(e)}\n\n"

        finally:
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


# ------------------------------------------------------------------
# Game end
# ------------------------------------------------------------------

@app.post("/api/game/end/{room_id}")
async def end_game(room_id: str):
    result = game_turn.end_game(room_id)
    _consume_directives(result, room_id)
    return result.response


# ------------------------------------------------------------------
# Utility endpoints
# ------------------------------------------------------------------

@app.get("/api/sessions/active")
async def get_active_sessions():
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
