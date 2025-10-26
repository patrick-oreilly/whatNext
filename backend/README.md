# What's Next - Backend API

AI-powered collaborative storytelling game backend built with FastAPI and Google ADK (Agent Development Kit).

## Overview

This backend provides a multiplayer game server where an AI Game Master creates interactive stories for 2-4 players. Players submit story continuation ideas, vote on their favorites, and watch as the AI weaves the winning choices into a dynamic narrative.

**Key Features:**
- Real-time AI story generation using Gemini 2.0 Flash Live
- Multiplayer game room management
- Turn-based gameplay with voting mechanics
- Server-Sent Events (SSE) for streaming AI responses
- In-memory storage with extensible storage interface

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Google ADK** - Agent Development Kit for AI interactions
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **Python 3.13+**

## Prerequisites

- Python 3.13 or higher
- Google API Key (for Gemini API access)

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
GOOGLE_API_KEY=your_google_api_key_here
```

**Where to get your API key:**
- Visit [Google AI Studio](https://aistudio.google.com/apikey)
- Create or select a project
- Generate an API key for Gemini

## Running the Server

### From the project root directory:

```bash
python -m backend.api_server
```

The server will start on `http://0.0.0.0:8080`

### Development Mode (with auto-reload):

```bash
uvicorn backend.api_server:app --reload --host 0.0.0.0 --port 8080
```

### Check if it's running:

Open your browser to:
- Health Check: http://localhost:8080/health
- API Docs: http://localhost:8080/docs

## Project Structure

```
backend/
├── agent/                      # AI Agent configuration
│   ├── __init__.py
│   ├── agent.py               # Root agent definition
│   └── prompts.py             # Story prompts and instructions
├── core/                       # Core application logic
│   ├── __init__.py
│   ├── config.py              # Application settings
│   ├── errors.py              # Custom exceptions
│   ├── models.py              # Pydantic data models
│   └── storage.py             # Storage interface & implementation
├── game_management/            # Game logic
│   ├── __init__.py
│   ├── room_manager.py        # Room and game state management
│   └── story_generator.py    # AI prompt generation
├── session_management/         # ADK session handling
│   ├── __init__.py
│   └── session_manager.py     # ADK session lifecycle
├── api_server.py              # Main FastAPI application
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables (not in git)
└── README.md                  # This file
```

## API Endpoints

### Health & Status
- `GET /` - Health check
- `GET /health` - Detailed health status
- `GET /rooms` - List all active rooms

### Room Management
- `POST /api/rooms/create` - Create a new game room
- `POST /api/rooms/join` - Join an existing room
- `POST /api/rooms/{room_id}/start` - Start the game
- `GET /api/rooms/{room_id}/state` - Get room state
- `DELETE /api/rooms/{room_id}` - Delete a room

### Gameplay
- `POST /api/input/submit` - Submit story continuation
- `POST /api/voting/cast` - Vote for a player's input
- `GET /api/voting/results/{room_id}` - Get voting results
- `POST /api/turn/advance/{room_id}` - Advance to next turn

### AI Streaming
- `GET /api/story/stream/{room_id}` - Stream AI-generated story (SSE)

### Utility
- `GET /api/sessions/active` - View active ADK sessions
- `POST /api/cleanup/run` - Manually trigger room cleanup

**Full API documentation:** http://localhost:8080/docs (when server is running)

## Configuration

Edit `backend/core/config.py` or set environment variables:

| Setting | Default | Description |
|---------|---------|-------------|
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `8080` | Server port |
| `MAX_PLAYERS` | `4` | Maximum players per room |
| `MIN_PLAYERS` | `2` | Minimum players to start |
| `MAX_TURNS` | `10` | Maximum story turns |
| `IDLE_TIMEOUT_MINUTES` | `30` | Room cleanup timeout |
| `MODEL_NAME` | `gemini-2.0-flash-live-001` | AI model to use |
| `LOG_LEVEL` | `INFO` | Logging level |

## Game Flow

1. **Create Room** - Host creates a room with a storyline
2. **Players Join** - 2-4 players join using room code
3. **Start Game** - Host starts when ready
4. **AI Opening** - AI generates opening scene (streamed)
5. **Player Input** - All players submit story continuations
6. **Voting** - Players vote for their favorite continuation
7. **AI Continues** - AI incorporates winning input into story
8. **Repeat** - Steps 5-7 repeat for MAX_TURNS
9. **Game Over** - Story concludes, final scores shown

## Available Storylines

Defined in `backend/core/models.py`:

- `HOOP_DREAMS` - Basketball-themed adventure
- `SPACE_EXPLORATION` - Sci-fi space adventure
- `CASINO_HEIST` - Heist thriller
- `HAUNTED_MANSION` - Horror mystery
- `CUSTOM_STORYLINE` - Player-defined story

## Development

### Running Tests

```bash
pytest
```

### Adding a New Storyline

1. Add enum value to `StoryLineType` in `core/models.py`
2. Add prompt in `agent/prompts.py`
3. Update `get_storyline_prompt()` in `game_management/story_generator.py`

### Extending Storage

The storage interface in `core/storage.py` can be extended:

```python
class DatabaseStorage(Storage):
    """Your database implementation"""
    def save_room(self, room: GameRoom) -> None:
        # Implement database save
        pass
```

Then update `create_storage()` factory function.

## Troubleshooting

### Import Errors
**Problem:** `ModuleNotFoundError: No module named 'backend'`

**Solution:** Run from project root using: `python -m backend.api_server`

### API Key Issues
**Problem:** Server fails to start with API key error

**Solution:** Ensure `.env` file exists with valid `GOOGLE_API_KEY`

### Port Already in Use
**Problem:** `Address already in use`

**Solution:** Change port in `config.py` or kill process using port 8080:
```bash
lsof -ti:8080 | xargs kill -9
```

## License

MIT

---

Built with FastAPI and Google ADK | Powered by Gemini 2.0 Flash
