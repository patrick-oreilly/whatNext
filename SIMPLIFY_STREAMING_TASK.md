# Task: Simplify ADK Streaming Implementation

## Executive Summary

**Problem:** Using bidirectional streaming (`run_live()` + `LiveRequestQueue`) for a turn-based game that only needs sequential request-response.

**Solution:** Switch to simple `runner.run()` with automatic session history management.

**Impact:**
- Remove ~70-80 lines of code
- Simpler architecture
- Same functionality
- Automatic conversation history

**Time:** ~2 hours

---

## Quick Start

If you just want to dive in:

1. Read "Current Architecture" and "Proposed Simplified Architecture" sections
2. Follow Steps 1-10 in order
3. Test with the checklist
4. Done!

---

## Overview
The current implementation uses bidirectional streaming (`LiveRequestQueue` + `run_live()`) for a simple sequential request-response pattern. This is overkill. This document outlines how to simplify the streaming to use the standard `run()` method with session management.

---

## Current Architecture (Overcomplicated)

**File:** `backend/session_management/session_manager.py`

### What it does:
- Creates `LiveRequestQueue` for bidirectional communication (lines 89-90)
- Uses `runner.run_live()` to get live event stream (lines 93-97)
- Sends messages via `live_request_queue.send_content()` (line 154)
- Streams responses by iterating over `live_events` async generator (line 191)

### Why it's overkill:
Your application has a **turn-based sequential flow**:
1. Send message (e.g., "Start story")
2. Wait for complete response
3. Send next message (e.g., "Continue with player input")
4. Repeat

You never:
- Send messages while receiving responses
- Interrupt ongoing responses
- Have concurrent exchanges on the same stream

**Bidirectional streaming is designed for real-time conversations where users can interrupt the AI mid-response.**

---

## Proposed Simplified Architecture

### Core Concept
Use `InMemoryRunner.run()` with proper session management:
- **Session maintains conversation history** (all previous turns)
- **runner.run()** sends new content and streams the response
- **No queue, no live events, no complexity**

### Key ADK Components

#### 1. InMemoryRunner
```python
from google.adk.runners import InMemoryRunner

runner = InMemoryRunner(
    app_name="What Next Game",
    agent=root_agent,
)
```

#### 2. Session Management
Sessions track conversation history across multiple turns:

```python
# Create session once per room
session = await runner.session_service.create_session(
    app_name="What Next Game",
    user_id=room_id,
)

# Session object contains:
# - session.id: unique identifier
# - session.events: chronological array of all interactions
# - Automatically maintained by runner.run()
```

#### 3. Simple Streaming Pattern
```python
# Send message and stream response
async for event in runner.run(
    session=session,
    content=Content(role="user", parts=[Part.from_text(message)]),
    run_config=RunConfig(response_modalities=["TEXT"])
):
    if event.content and event.content.parts:
        text_chunk = event.content.parts[0].text
        if text_chunk:
            yield text_chunk

    if event.turn_complete:
        break
```

**Session history is automatically appended** - you don't manage it manually.

---

## Implementation Steps

### Step 1: Update SessionInfo Class
**File:** `backend/session_management/session_manager.py:19-35`

**Current:**
```python
class SessionInfo:
    def __init__(
        self,
        room_id: str,
        session_id: str,
        live_events,
        live_request_queue: LiveRequestQueue,
        created_at: datetime
    ):
        self.room_id = room_id
        self.session_id = session_id
        self.live_events = live_events
        self.live_request_queue = live_request_queue
        self.created_at = created_at
        self.message_count = 0
```

**Replace with:**
```python
class SessionInfo:
    """Stores information about an active ADK session"""

    def __init__(
        self,
        room_id: str,
        session,  # ADK Session object
        runner: InMemoryRunner,
        created_at: datetime
    ):
        self.room_id = room_id
        self.session = session  # Contains session.id and conversation history
        self.runner = runner
        self.created_at = created_at
        self.message_count = 0
```

**Why:**
- Store the runner and session directly
- Remove LiveRequestQueue and live_events
- Session object contains all conversation history automatically

---

### Step 2: Simplify create_session()
**File:** `backend/session_management/session_manager.py:49-119`

**Replace entire method with:**
```python
async def create_session(
    self,
    room_id: str,
    agent,
    user_id: Optional[str] = None
) -> SessionInfo:
    """
    Create a new ADK session for a room

    Args:
        room_id: Unique room identifier
        agent: The ADK agent to use for this session
        user_id: Optional user ID (defaults to room_id)

    Returns:
        SessionInfo with runner and session
    """
    if room_id in self.sessions:
        logger.warning(f"Session already exists for room {room_id}, closing old session")
        self.close_session(room_id)

    if user_id is None:
        user_id = room_id

    try:
        # Create InMemoryRunner
        runner = InMemoryRunner(
            app_name=self._app_name,
            agent=agent,
        )

        # Create ADK Session (maintains conversation history)
        session = await runner.session_service.create_session(
            app_name=self._app_name,
            user_id=user_id,
        )

        # Store session info
        session_info = SessionInfo(
            room_id=room_id,
            session=session,
            runner=runner,
            created_at=datetime.now()
        )

        self.sessions[room_id] = session_info

        logger.info(
            f"Created ADK session for room {room_id} "
            f"(session_id: {session.id})"
        )

        return session_info

    except Exception as e:
        logger.error(f"Failed to create session for room {room_id}: {e}")
        raise
```

**Changes:**
- Removed LiveRequestQueue creation
- Removed runner.run_live() call
- Store runner and session directly
- Much simpler: 20 lines shorter

---

### Step 3: Simplify stream_response()
**File:** `backend/session_management/session_manager.py:161-252`

**Replace entire method with:**
```python
async def stream_response(
    self,
    room_id: str,
    message: str,
    max_retries: int = 3
) -> AsyncGenerator[str, None]:
    """
    Send message and stream text response from agent

    Yields text chunks as they're generated by the agent.
    Session history is automatically maintained.

    Args:
        room_id: Room identifier
        message: Text message to send to agent
        max_retries: Maximum number of retry attempts

    Yields:
        Text chunks from agent response
    """
    session_info = self.sessions.get(room_id)

    if not session_info:
        raise ValueError(f"No active session for room {room_id}")

    retry_count = 0

    while retry_count <= max_retries:
        try:
            logger.info(f"Sending message to room {room_id}: {message[:100]}...")

            # Create Content with text Part
            content = Content(
                role="user",
                parts=[Part.from_text(text=message)]
            )

            # Configure for TEXT response
            run_config = RunConfig(response_modalities=["TEXT"])

            # Stream response using simple run() method
            async for event in session_info.runner.run(
                session=session_info.session,
                content=content,
                run_config=run_config,
            ):
                logger.debug(f"Event: turn_complete={event.turn_complete}, partial={getattr(event, 'partial', None)}")

                # Check for turn completion
                if event.turn_complete:
                    logger.info(f"Turn complete for room {room_id}")
                    break

                # Check for interruption
                if event.interrupted:
                    logger.warning(f"Turn interrupted for room {room_id}")
                    break

                # Extract and yield text content
                if event.content and event.content.parts:
                    part = event.content.parts[0]

                    if part.text and getattr(event, 'partial', False):
                        logger.debug(f"Yielding chunk: '{part.text}'")
                        yield part.text

            # Successfully completed streaming
            session_info.message_count += 1
            return

        except Exception as e:
            retry_count += 1
            logger.error(
                f"Error streaming for room {room_id} "
                f"(attempt {retry_count}/{max_retries}): {e}"
            )

            if retry_count <= max_retries:
                logger.info(f"Retrying stream for room {room_id}...")
                await asyncio.sleep(1)
            else:
                logger.error(f"Max retries exceeded for room {room_id}")
                raise
```

**Key Changes:**
- Combined `send_message()` and `stream_response()` into one method
- No more queue - just call `runner.run()` directly
- Message becomes a parameter (send and stream in one operation)
- Session history automatically maintained by ADK
- Reduced from 90+ lines to ~70 lines

---

### Step 4: Remove send_message() Method
**File:** `backend/session_management/session_manager.py:121-159`

**Action:** DELETE this entire method

**Why:**
- No longer needed - `stream_response()` now handles sending
- No LiveRequestQueue to send to
- Simpler API: one method does both send + stream

---

### Step 5: Simplify close_session()
**File:** `backend/session_management/session_manager.py:254-277`

**Replace with:**
```python
def close_session(self, room_id: str) -> None:
    """
    Close and cleanup a session

    Args:
        room_id: Room identifier
    """
    if room_id not in self.sessions:
        logger.warning(f"No session to close for room {room_id}")
        return

    try:
        # Remove from active sessions
        del self.sessions[room_id]
        logger.info(f"Closed session for room {room_id}")

    except Exception as e:
        logger.error(f"Error closing session for room {room_id}: {e}")
```

**Changes:**
- Removed `live_request_queue.close()` (doesn't exist anymore)
- Simpler cleanup

---

### Step 6: Update API Server Imports
**File:** `backend/api_server.py:8-10`

**Current:**
```python
from google.adk.agents import LiveRequestQueue
from google.adk.runners import InMemoryRunner
from google.adk.agents.run_config import RunConfig
```

**Replace with:**
```python
from google.adk.runners import InMemoryRunner
from google.adk.agents.run_config import RunConfig
from google.genai.types import Part, Content
```

**Changes:**
- Remove LiveRequestQueue import (no longer used)
- Keep RunConfig and Content/Part imports

---

### Step 7: Update start_game Endpoint
**File:** `backend/api_server.py:180-212`

**Current:**
```python
# Create ADK session with streaming support
session_info = await session_manager.create_session(
    room_id=room_id,
    agent=root_agent,
    user_id=room_id
)

# Send initial message to start the story
initial_message = story_generator.get_storyline_prompt(room.storyline)
session_manager.send_message(room_id, initial_message)
```

**Replace with:**
```python
# Create ADK session
session_info = await session_manager.create_session(
    room_id=room_id,
    agent=root_agent,
    user_id=room_id
)

# Store initial prompt for first stream
initial_message = story_generator.get_storyline_prompt(room.storyline)
room.next_prompt = initial_message
room_manager.storage.save_room(room)  # Persist the prompt
```

**Why:**
- No separate `send_message()` method anymore
- Message sending happens in `stream_response()`
- You'll handle the initial prompt in the stream endpoint

---

### Step 8: Update stream_story Endpoint
**File:** `backend/api_server.py:424-530`

**Current stream call:**
```python
async for chunk in session_manager.stream_response(room_id):
    full_response += chunk
    chunks.append(chunk)
    yield f"data: {chunk}\n\n"
    await asyncio.sleep(0.01)
```

**Replace with:**
```python
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
    yield f"data: {chunk}\n\n"
    await asyncio.sleep(0.01)

# Clear the prompt after use (optional)
room.next_prompt = None
room_manager.storage.save_room(room)
```

**Why:**
- `stream_response()` now takes the message as a parameter
- Need to determine what message to send based on game state
- Session history is maintained automatically

---

### Step 9: Update advance_turn Endpoint
**File:** `backend/api_server.py:359-416`

**Current:**
```python
# Generate continuation prompt
if story_generator.should_end_story(room.turn, room.max_turns):
    prompt = story_generator.generate_final_prompt(...)
else:
    prompt = story_generator.generate_continuation_prompt(...)

# Set phase to GENERATING_STORY
room_manager.set_phase(room_id, GamePhase.GENERATING_STORY)

# Send prompt to ADK agent
session_manager.send_message(room_id, prompt)
```

**Replace with:**
```python
# Generate continuation prompt
if story_generator.should_end_story(room.turn, room.max_turns):
    prompt = story_generator.generate_final_prompt(...)
else:
    prompt = story_generator.generate_continuation_prompt(...)

# Store prompt for next stream call
room.next_prompt = prompt  # Add this field to Room model

# Set phase to GENERATING_STORY
room_manager.set_phase(room_id, GamePhase.GENERATING_STORY)

# Note: Prompt will be sent when client connects to stream endpoint
```

**Changes:**
- No `send_message()` call
- Store prompt in room for the stream endpoint to use
- Sending happens in `stream_response()`

---

### Step 10: Add next_prompt to GameRoom Model
**File:** `backend/core/models.py:47-62`

**Add field after line 61:**
```python
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
    input_phase_start_time: Optional[datetime] = None
    timed_out_players: List[str] = []
    next_prompt: Optional[str] = None  # ADD THIS LINE - Prompt for next AI generation
```

**Why:**
- Need to store the prepared prompt between `advance_turn` and `stream_story` calls
- Decouples prompt generation from streaming

---

## Updated Imports

### session_manager.py
```python
import asyncio
import logging
from typing import Dict, Optional, AsyncGenerator
from datetime import datetime

from google.adk.runners import InMemoryRunner
from google.adk.agents.run_config import RunConfig
from google.genai.types import Part, Content

logger = logging.getLogger(__name__)
```

**Removed:** `LiveRequestQueue`

---

## Testing Checklist

After implementation, test:

- [ ] Create room successfully
- [ ] Start game - initial story streams correctly
- [ ] Player submits input
- [ ] Vote and advance turn
- [ ] Story continuation streams correctly (with history context)
- [ ] Multiple turns work (history is maintained)
- [ ] Game completion works
- [ ] Room deletion cleans up session
- [ ] Error handling: retry logic works
- [ ] Multiple rooms can run simultaneously
- [ ] Late joiners to stream get cached responses (existing cache logic)

---

## Benefits of This Approach

### 1. **Simpler Code**
- Remove ~50 lines of complexity
- Fewer components to manage
- Clearer flow: one method to send + stream

### 2. **Automatic History Management**
- ADK Session automatically maintains conversation history
- Each `runner.run()` call appends to session.events
- Context preserved across turns without manual tracking

### 3. **Same Streaming Behavior**
- Still get real-time text chunks
- Still supports SSE to frontend
- Still can cache for late joiners

### 4. **Better Match to Use Case**
- Turn-based sequential flow
- No need for concurrent bidirectional streaming
- No interruptions or parallel exchanges

### 5. **Easier to Debug**
- Single method handles send + stream
- Less state to track
- Clearer logs

---

## Key ADK Concepts

### Session Object
- Created once per conversation
- Contains `events` array with full history
- Automatically updated by `runner.run()`
- Identified by `session.id`

### InMemoryRunner
- Non-persistent (lives in memory)
- Has `session_service` for creating/managing sessions
- `run()` method: send content + stream response
- Automatically appends to session history

### run() vs run_live()
- **run()**: Simple request-response with streaming
  - Send content
  - Get streamed response
  - Session history maintained automatically
  - Use for: chatbots, sequential conversations, turn-based games

- **run_live()**: Bidirectional streaming
  - Send multiple messages while receiving responses
  - Can interrupt ongoing responses
  - Requires LiveRequestQueue
  - Use for: real-time voice, concurrent interactions, interruptions

---

## Common Pitfalls to Avoid

### 1. Don't manually manage history
The session.events array is managed by ADK. Don't try to append to it yourself.

### 2. Don't recreate runner per message
Create the runner once per room, reuse for all turns.

### 3. Do check event.partial for streaming
```python
if part.text and event.partial:  # partial = streaming chunk
    yield part.text
```

### 4. Do handle turn_complete
```python
if event.turn_complete:
    break  # Stop iterating
```

### 5. Do use same session across turns
```python
# GOOD: Reuse session
async for event in runner.run(session=session_info.session, content=...):

# BAD: Create new session each time
```

---

## File Modification Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `session_manager.py` | Update SessionInfo class | ~10 |
| `session_manager.py` | Simplify create_session() | -20 |
| `session_manager.py` | Simplify stream_response() | -30 |
| `session_manager.py` | Remove send_message() | -40 |
| `session_manager.py` | Simplify close_session() | -5 |
| `session_manager.py` | Update imports | -1 |
| `api_server.py` | Update imports | -1 |
| `api_server.py` | Update start_game() | ~5 |
| `api_server.py` | Update stream_story() | ~10 |
| `api_server.py` | Update advance_turn() | ~5 |
| `core/models.py` | Add next_prompt field to GameRoom | +1 |

**Total reduction: ~70-80 lines of code**

---

## Questions?

### Q: Will this break existing functionality?
A: No - same streaming behavior to the frontend, just simpler backend.

### Q: Is conversation history really automatic?
A: Yes! Each `runner.run()` call with the same session automatically appends the interaction to `session.events`.

### Q: Can I still cache responses for late joiners?
A: Yes - the existing cache logic in `stream_story()` endpoint still works.

### Q: What if I need bidirectional streaming later?
A: If requirements change (e.g., players can interrupt AI mid-response), you can switch back to `run_live()`. But for your current turn-based game, it's unnecessary.

---

## Implementation Time Estimate

- **Reading this doc:** 15 minutes
- **Making changes:** 45-60 minutes
- **Testing:** 30 minutes
- **Total:** ~2 hours

---

## References

- ADK Session Documentation: https://google.github.io/adk-docs/sessions/session/
- Your current code: `backend/session_management/session_manager.py`
- Your API: `backend/api_server.py`
