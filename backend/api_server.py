import asyncio
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
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
            deleted_ids = room_manager.cleanup_idle_rooms()
            for room_id in deleted_ids:
                session_manager.close_session(room_id)
                await purge_active_streams(room_id)
            if deleted_ids:
                logger.info(f"Background cleanup: removed {len(deleted_ids)} idle rooms")
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


def _require_member_token(room, player_token: str) -> None:
    """Authorize an action available to any player in the room."""
    if not player_token or player_token not in room.player_tokens.values():
        raise HTTPException(status_code=403, detail="A valid player token is required")


def _require_host_token(room, player_token: str) -> None:
    """Authorize a privileged action restricted to the host.

    The host is identified by the stored ``host_token`` (assigned to the first
    joiner and reassigned on host departure), never by seat order or name.
    """
    if not room.host_token:
        raise HTTPException(status_code=403, detail="Room has no host")
    if not player_token or player_token != room.host_token:
        raise HTTPException(status_code=403, detail="Only the host can perform this action")


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
    lock = await room_manager.get_room_lock(request.room_id)
    async with lock:
        room_manager.add_player(request.room_id, request.player_name)
        room = room_manager.get_room(request.room_id)
        player_token = str(uuid.uuid4())
        room.player_tokens[request.player_name] = player_token
        # The first player to join becomes the host.
        if room.host_token is None:
            room.host_token = player_token
        room_manager.save_room(room)
    logger.info(f"Player '{request.player_name}' joined room {request.room_id}")
    return JoinRoomResponse(
        room_id=request.room_id,
        players=room.players,
        player_token=player_token
    )


@app.post("/api/rooms/{room_id}/start")
async def start_game(room_id: str, player_token: str = Body(default=None, embed=True)):
    lock = await room_manager.get_room_lock(room_id)
    async with lock:
        _require_host_token(room_manager.get_room(room_id), player_token)
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
async def trigger_input_timeout(room_id: str, player_token: str = Body(default=None, embed=True)):
    logger.info(f"Input timeout triggered for room {room_id}")
    lock = await room_manager.get_room_lock(room_id)
    async with lock:
        _require_member_token(room_manager.get_room(room_id), player_token)
        result = game_turn.handle_input_timeout(room_id)
    return result.response


@app.get("/api/voting/{room_id}/timer")
async def get_voting_timer(room_id: str):
    result = game_turn.get_voting_timer(room_id)
    return result.response


@app.delete("/api/rooms/{room_id}")
async def delete_room(room_id: str, player_token: str = Body(default=None, embed=True)):
    lock = await room_manager.get_room_lock(room_id)
    async with lock:
        _require_host_token(room_manager.get_room(room_id), player_token)
        session_manager.close_session(room_id)
        room_manager.delete_room(room_id)
    await purge_active_streams(room_id)
    logger.info(f"Deleted room {room_id}")
    return {"status": "deleted", "room_id": room_id}


# ------------------------------------------------------------------
# Gameplay endpoints
# ------------------------------------------------------------------

@app.post("/api/input/submit")
async def submit_input(request: SubmitInputRequest):
    lock = await room_manager.get_room_lock(request.room_id)
    async with lock:
        room = room_manager.get_room(request.room_id)
        stored_token = room.player_tokens.get(request.player_name)
        if stored_token and stored_token != request.player_token:
            raise HTTPException(status_code=403, detail="Invalid player token")
        result = game_turn.submit_input(
            room_id=request.room_id,
            player_name=request.player_name,
            input_text=request.input_text
        )
    logger.info(f"Player '{request.player_name}' submitted input in room {request.room_id}")
    return result.response


@app.post("/api/voting/cast")
async def cast_vote(request: CastVoteRequest):
    lock = await room_manager.get_room_lock(request.room_id)
    async with lock:
        room = room_manager.get_room(request.room_id)
        stored_token = room.player_tokens.get(request.voter)
        if stored_token and stored_token != request.player_token:
            raise HTTPException(status_code=403, detail="Invalid player token")
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
async def trigger_voting_timeout(room_id: str, player_token: str = Body(default=None, embed=True)):
    _require_member_token(room_manager.get_room(room_id), player_token)
    result = await game_turn.handle_voting_timeout(room_id)
    logger.info(f"Voting timeout handled in room {room_id}")
    return result.response


@app.post("/api/turn/advance/{room_id}")
async def advance_turn(room_id: str, player_token: str = Body(default=None, embed=True)):
    lock = await room_manager.get_room_lock(room_id)
    async with lock:
        _require_member_token(room_manager.get_room(room_id), player_token)
        result = game_turn.advance_turn(room_id)
    _consume_directives(result, room_id)
    return result.response


# ------------------------------------------------------------------
# Story streaming
# ------------------------------------------------------------------

active_streams = {}
active_streams_lock = asyncio.Lock()


async def purge_active_streams(room_id: str) -> int:
    """Remove any cached stream entries for a room (all turns) on teardown.

    Stream keys are ``{room_id}_turn_{turn}``. The per-stream ``finally`` only
    runs when its generator completes, so a room torn down mid-stream (or whose
    generator is abandoned) can leave entries behind — purge them explicitly.
    """
    prefix = f"{room_id}_turn_"
    async with active_streams_lock:
        stale_keys = [k for k in active_streams if k.startswith(prefix)]
        for key in stale_keys:
            del active_streams[key]
    return len(stale_keys)


@app.get("/api/story/stream/{room_id}")
async def stream_story(room_id: str):
    room = room_manager.get_room(room_id)
    stream_key = f"{room_id}_turn_{room.turn}"

    # Check if a stream is already active for this room+turn
    async with active_streams_lock:
        if stream_key in active_streams:
            is_primary = False
            logger.info(
                f"Stream already active for room {room_id} turn {room.turn}, "
                "waiting for existing generation to complete"
            )
            stream_data = active_streams[stream_key]
        else:
            is_primary = True
            stream_data = active_streams[stream_key] = {
                "event": asyncio.Event(),
                "response": [],
                "error": None,
            }

    # Only latecomers wait — the primary is the one that sets this event, so it
    # must fall through to run the generator below.
    if not is_primary and not stream_data["event"].is_set():
        logger.info(f"Waiting for primary stream to finish for {stream_key}")
        await stream_data["event"].wait()
        logger.info(f"Primary stream finished for {stream_key}, replaying cached response")

    # Replay cached response
    if stream_data.get("response"):
        async def replay_generator():
            cached = stream_data["response"]
            for chunk in cached:
                yield f"data: {json.dumps({'paragraph': chunk})}\n\n"
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

    if stream_data.get("error"):
        async def error_generator():
            yield f"data: [ERROR] {stream_data['error']}\n\n"

        return StreamingResponse(
            error_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    # Primary stream — this is the first request for this turn
    async def event_generator():
        try:
            full_response = ""
            paragraph_chunks = []

            room = room_manager.get_room(room_id)

            if not room.next_prompt:
                stream_data["error"] = "No prompt prepared"
                stream_data["event"].set()
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
                    yield f"data: {json.dumps({'paragraph': chunk})}\n\n"
                    await asyncio.sleep(0.02)

            stream_data["response"] = paragraph_chunks
            stream_data["event"].set()

            _consume_directives(result, room_id)

            yield "data: [DONE]\n\n"

            logger.info(f"Story streaming completed for room {room_id}, turn {room.turn}")

        except Exception as e:
            logger.error(f"Error streaming story for room {room_id}: {e}")
            stream_data["error"] = str(e)
            stream_data["event"].set()
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
async def end_game(room_id: str, player_token: str = Body(default=None, embed=True)):
    lock = await room_manager.get_room_lock(room_id)
    async with lock:
        _require_host_token(room_manager.get_room(room_id), player_token)
        result = game_turn.end_game(room_id)
    _consume_directives(result, room_id)
    logger.info(f"Game ended for room {room_id}")
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
    deleted_ids = room_manager.cleanup_idle_rooms()
    for room_id in deleted_ids:
        session_manager.close_session(room_id)
        await purge_active_streams(room_id)
    return {
        "status": "complete",
        "rooms_deleted": len(deleted_ids)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower()
    )
