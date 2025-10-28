# What's Next Backend - Comprehensive Overview

## Introduction

The backend for "What's Next" is a FastAPI-based API server that powers an AI-driven collaborative storytelling game. It manages multiplayer game rooms, handles real-time AI story generation using Google's Agent Development Kit (ADK), and orchestrates turn-based gameplay with voting mechanics. The system supports 2-10 players per room, with games lasting up to 10 turns, where players submit story continuations, vote on favorites, and watch the AI incorporate winners into the narrative.

Key technologies:
- **FastAPI**: For the web API and WebSocket-like streaming via Server-Sent Events (SSE).
- **Google ADK**: For AI agent interactions with Gemini models.
- **Pydantic**: For data validation and models.
- **In-memory storage**: For game state (extensible to databases).

The backend runs on port 8080 by default and is designed for deployment on Google Cloud Run.

## Project Structure

```
backend/
├── agent/                      # AI Agent configuration
│   ├── __init__.py
│   ├── agent.py               # Defines the root LlmAgent using Gemini
│   └── prompts.py             # Storyline-specific prompts (e.g., Hoop Dreams, Space Exploration)
├── core/                       # Core utilities and models
│   ├── __init__.py
│   ├── config.py              # Settings class with validation
│   ├── errors.py              # Custom exceptions and FastAPI handlers
│   ├── models.py              # Pydantic models for rooms, phases, requests/responses
│   └── storage.py             # Abstract Storage interface with InMemoryStorage impl
├── game_management/            # Game logic
│   ├── __init__.py
│   ├── room_manager.py        # Manages rooms, players, phases, voting, timeouts
│   └── story_generator.py     # Generates prompts for AI based on storyline and history
├── session_management/         # ADK session handling
│   ├── __init__.py
│   └── session_manager.py     # Creates/manages ADK sessions for streaming AI responses
├── api_server.py              # Main FastAPI app with endpoints and lifecycle
├── requirements.txt           # Dependencies (google-adk, fastapi, uvicorn, etc.)
├── Procfile                   # For Heroku/Cloud Run deployment
├── README.md                  # Basic setup instructions
└── test.py                    # Simple test script for model pricing (not core)
```

## Dependencies

From `requirements.txt`:
- `google-adk`: For AI agent interactions.
- `fastapi`: Web framework.
- `uvicorn`: ASGI server.
- `python-multipart`: For form data handling.
- `pydantic`: Data models.
- `python-dotenv`: Environment variable loading.
- `pytest` and `pytest-asyncio`: Testing.

Install with `pip install -r requirements.txt`.

## Configuration

Settings are defined in `core/config.py` as a `Settings` class, loaded from `.env` via `dotenv`. Key configs:

- **API**: `HOST=0.0.0.0`, `PORT=8080`, `CORS_ORIGINS=["*"]`.
- **Game**: `MAX_PLAYERS=10`, `MIN_PLAYERS=2`, `MAX_TURNS=10`, `INPUT_TIMER_SECONDS=120`, `VOTING_TIMER_SECONDS=60`.
- **Room**: `IDLE_TIMEOUT_MINUTES=30`, `ROOM_ID_LENGTH=6`.
- **ADK**: `GOOGLE_API_KEY` (required), `MODEL_NAME="gemini-2.5-flash-lite"`.
- **Logging**: `LOG_LEVEL="INFO"`.

Validation occurs on startup; missing `GOOGLE_API_KEY` raises an error.

## Core Components

### 1. Models (`core/models.py`)
Pydantic models define the data structures:

- **Enums**:
  - `GamePhase`: `LOBBY`, `GENERATING_STORY`, `PLAYER_INPUT`, `VOTING`, `GAME_OVER`.
  - `StoryLineType`: `HOOP_DREAMS`, `SPACE_EXPLORATION`, `CASINO_HEIST`, `HAUNTED_MANSION`, `SUNFLOWER_WEST`, `CUSTOM_STORYLINE`.

- **Key Models**:
  - `GameRoom`: Full room state (ID, players, scores, turn, phase, story history, inputs, timers).
  - `PlayerInput`: Player's submission (name, text, votes, voters).
  - `StorySegment`: AI-generated story part (turn, content, winning player).
  - Request/Response models: `CreateRoomRequest`, `SubmitInputRequest`, `RoomStateResponse`, etc.

Methods on `GameRoom` handle activity updates, full checks, timeouts.

### 2. Storage (`core/storage.py`)
Abstract `Storage` interface for room persistence:
- Methods: `save_room`, `get_room`, `delete_room`, `list_rooms`, `room_exists`.

Current impl: `InMemoryStorage` (dict-based, non-persistent). Factory `create_storage("memory")` creates it. Easily extensible to Redis/Postgres.

### 3. Errors (`core/errors.py`)
Custom exceptions:
- `RoomNotFoundError`, `RoomFullError`, `PlayerNotInRoomError`, `InvalidGamePhaseError`, etc.

FastAPI exception handlers return JSON errors (e.g., 404 for missing rooms). Registered in `api_server.py`.

### 4. Config (`core/config.py`)
`Settings` class with class vars and `validate()` method. Loads from env via `dotenv`.

### 5. Agent (`agent/agent.py` & `prompts.py`)
- `root_agent`: `LlmAgent` using `gemini-2.5-flash-lite` with base instruction from `prompts.py`.
- Prompts: Detailed, storyline-specific instructions (e.g., `HOOP_DREAMS_PROMPT` for basketball career sim, uncensored adult themes). Supports open-ended player agency.

### 6. Room Manager (`game_management/room_manager.py`)
Central game logic:
- Room CRUD: Create (generate 6-char ID), get, delete, list.
- Players: Add/remove, validate duplicates/fullness/phase.
- Game Flow: Start (check min players), advance turn, set phase, handle input timeout (marks non-submitters, advances if possible).
- Inputs: Submit (allows updates, auto-advance on all submissions).
- Voting: Cast (no self-votes, only if submitted), calculate winner (max votes, award 15 pts/vote).
- Story: Add segments, get full story.
- Cleanup: Remove idle rooms (>30 min).

Raises custom errors for invalid states.

### 7. Story Generator (`game_management/story_generator.py`)
Prompt engineering:
- `get_storyline_prompt`: Returns storyline-specific prompt.
- `generate_opening_prompt`: Base prompt for first turn.
- `generate_continuation_prompt`: Formats winning input + ending hints if near max turns.
- `generate_final_prompt`: Winning input + explicit ending instruction.
- `format_player_input`: Cleans and frames input.
- `should_end_story`: Checks turn >= max.

### 8. Session Manager (`session_management/session_manager.py`)
Handles ADK sessions:
- `create_session`: Uses `InMemoryRunner` + `session_service` for persistent convos.
- `stream_response`: Sends `Content` (user role), streams events via `run()`, yields text chunks. Retries on error.
- `close_session`: Cleans up.
- Tracks active sessions.

### 9. API Server (`api_server.py`)
Main FastAPI app:
- **Lifespan**: Startup validates config, starts cleanup task (every 5 min). Shutdown closes sessions.
- **Middleware**: CORS for all origins.
- **Globals**: `storage`, `room_manager`, `session_manager`, `story_generator`.
- **Endpoints**:
  - Health: `/`, `/health` (status, rooms count).
  - Rooms: `POST /api/rooms/create` (storyline, max_turns), `POST /api/rooms/join` (ID, name), `POST /api/rooms/{id}/start`, `GET /api/rooms/{id}/state`, `DELETE /api/rooms/{id}`.
  - Timer: `GET /api/rooms/{id}/timer` (input phase remaining), `POST /api/rooms/{id}/timeout`.
  - Gameplay: `POST /api/input/submit` (room, name, text), `POST /api/voting/cast` (room, voter, chosen), `GET /api/voting/results/{id}`, `POST /api/turn/advance/{id}`.
  - Streaming: `GET /api/story/stream/{id}` (SSE chunks, caches for late joiners, advances phase).
  - Utils: `GET /api/sessions/active`, `POST /api/cleanup/run`.
- Logging: Configured with timestamp/name/level.
- Run: `uvicorn` or `python -m backend.api_server`.

## Game Flow

1. **Lobby**: Create room (6-char ID, storyline). Players join (validate name/phase/full).
2. **Start**: Host starts (min 2 players). Creates ADK session, sets `GENERATING_STORY`, preps initial prompt.
3. **Turn Loop** (up to 10):
   - AI Opening/Continuation: Stream via SSE (`/api/story/stream/{id}`) using ADK. Adds to history, sets `PLAYER_INPUT` (starts 120s timer).
   - Input: Players submit continuations (`/api/input/submit`). Timeout marks non-submitters, advances to `VOTING` if any submitted.
   - Voting: Players vote (`/api/voting/cast`, no self-vote). `GET /api/voting/results/{id}` computes winner (max votes, +15 pts).
   - Advance: `POST /api/turn/advance/{id}` generates next prompt (continuation/final), sends to ADK, increments turn. Ends if max reached (`GAME_OVER`).
4. **End**: Closes session, shows scores/story.

Background: Idle cleanup every 5 min.

## Error Handling

Custom exceptions with JSON responses (e.g., 400 for invalid phase). Handlers in `errors.py`. Retries in streaming (max 3).

## Deployment

- **Local**: `python -m backend.api_server`.
- **Cloud Run**: Use `Procfile` (`web: uvicorn api_server:app --host 0.0.0.0 --port $PORT`). Set `GOOGLE_API_KEY` env var.
- **Scaling**: In-memory storage limits persistence; extend for prod.

## Testing & Utils

- `test.py`: Lists Gemini models with pricing (e.g., `gemini-2.5-flash-lite`: $0.02/M in, $0.08/M out).
- Pytest for unit tests (not implemented yet).

## Potential Improvements

- Persistent storage (e.g., Firestore).
- WebSocket for real-time updates.
- Rate limiting on AI calls.
- More storylines/prompts.
- Authentication for rooms.

This covers the backend intimately. For code details, refer to source files.