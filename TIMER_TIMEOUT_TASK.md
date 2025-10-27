# Task: Implement Player Input Timer with Timeout Handling

## Overview
Implement a countdown timer for the player input phase that automatically excludes timed-out players from voting. Players who fail to submit their input before the timer expires will not have their inputs available in the voting screen.

## Current System Analysis

### Backend Structure
- **Player Input Phase**: `backend/game_management/room_manager.py:243-290`
  - Players submit inputs via `submit_input()` method
  - Currently auto-advances to voting when all players submit (line 287-290)
  - No timeout mechanism exists

- **Voting Phase**: `backend/game_management/room_manager.py:295-384`
  - Players vote on inputs via `cast_vote()` method
  - Validates that chosen player has input (line 322-330)
  - Currently assumes all players have submitted inputs

- **Timer Configuration**: `backend/core/config.py:19-20`
  - `INPUT_TIMER_SECONDS: int = 120` (2 minutes)
  - `VOTING_TIMER_SECONDS: int = 60` (1 minute)
  - Timers are defined but not currently used

- **Data Models**: `backend/core/models.py:28-34`
  - `PlayerInput` model includes timestamp field
  - Current fields: `player_name`, `text`, `votes`, `voters`, `timestamp`

### Frontend Structure
- **Player Input Component**: `web_frontend/src/components/game/PlayerInput.tsx`
  - Renders textarea for input submission
  - Shows submission status and waiting message
  - No timer display

- **Voting Panel**: `web_frontend/src/components/game/VotingPanel.tsx:55-81`
  - Filters out current player's input (line 56)
  - Displays all other player inputs
  - No special handling for missing/timed-out players

- **Game Page**: `web_frontend/src/pages/Game.tsx`
  - Main game orchestration component
  - Polls for game state updates every 3 seconds
  - No timer state management

## Implementation Tasks

### Task 1: Backend Timer Infrastructure

**File**: `backend/core/models.py`

**1.1** Add timeout tracking to PlayerInput phase
```python
class GameRoom(BaseModel):
    # ... existing fields ...
    input_phase_start_time: Optional[datetime] = None  # NEW: Track when input phase started
    timed_out_players: List[str] = []  # NEW: Track players who timed out
```

**1.2** Add helper method to check if input phase has timed out
```python
def is_input_phase_timed_out(self, timeout_seconds: int) -> bool:
    """Check if input phase has exceeded timeout"""
    if not self.input_phase_start_time:
        return False
    elapsed = (datetime.now() - self.input_phase_start_time).total_seconds()
    return elapsed >= timeout_seconds
```

**1.3** Add method to get remaining input time
```python
def get_input_time_remaining(self, timeout_seconds: int) -> float:
    """Get remaining time in input phase (seconds)"""
    if not self.input_phase_start_time:
        return timeout_seconds
    elapsed = (datetime.now() - self.input_phase_start_time).total_seconds()
    remaining = timeout_seconds - elapsed
    return max(0, remaining)
```

---

### Task 2: Backend Room Manager Updates

**File**: `backend/game_management/room_manager.py`

**2.1** Update `set_phase()` method to initialize timer (line 207-213)
```python
def set_phase(self, room_id: str, phase: GamePhase) -> None:
    """Set game phase"""
    room = self.get_room(room_id)
    room.phase = phase

    # NEW: Start input phase timer
    if phase == GamePhase.PLAYER_INPUT:
        room.input_phase_start_time = datetime.now()
        room.timed_out_players = []  # Reset timeout tracking

    room.update_activity()
    self.storage.save_room(room)
    logger.debug(f"Room {room_id} phase changed to {phase}")
```

**2.2** Add new method to handle input phase timeout
```python
def handle_input_timeout(self, room_id: str) -> None:
    """
    Handle input phase timeout

    - Identifies players who haven't submitted
    - Marks them as timed out
    - Advances to voting phase with only submitted inputs
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

    # Advance to voting if at least one player submitted
    if len(room.player_inputs) > 0:
        room.phase = GamePhase.VOTING
        room.update_activity()
        self.storage.save_room(room)
        logger.info(
            f"Advanced to voting with {len(room.player_inputs)} inputs in room {room_id}"
        )
    else:
        # If no one submitted, skip voting and advance turn
        logger.warning(f"No inputs submitted in room {room_id}, advancing turn")
        self.advance_turn(room_id)
```

**2.3** Update `cast_vote()` method to handle timed out players (line 295-348)
```python
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

    # ... existing validation code ...

    # NEW: Check if voter timed out (can't vote if you didn't submit)
    if voter in room.timed_out_players:
        raise VotingError(
            "Cannot vote - you did not submit an input during the input phase"
        )

    # ... rest of existing code ...
```

---

### Task 3: Backend API Endpoint Updates

**File**: `backend/api_server.py`

**3.1** Add new endpoint to get timer status (after line 223)
```python
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
```

**3.2** Add endpoint to manually trigger timeout (after timer endpoint)
```python
@app.post("/api/rooms/{room_id}/timeout")
async def trigger_input_timeout(room_id: str):
    """
    Manually trigger input phase timeout

    Used when timer expires on client side
    """
    room_manager.handle_input_timeout(room_id)

    return {
        "status": "timeout_handled",
        "room_id": room_id,
        "phase": room_manager.get_room(room_id).phase
    }
```

**3.3** Update RoomStateResponse to include timeout information

**File**: `backend/core/models.py:119-132`
```python
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
    input_phase_start_time: Optional[datetime] = None  # NEW
    timed_out_players: List[str] = []  # NEW

    class Config:
        use_enum_values = True
```

**3.4** Update `get_room_state()` method to include new fields

**File**: `backend/game_management/room_manager.py:73-86`
```python
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
        input_phase_start_time=room.input_phase_start_time,  # NEW
        timed_out_players=room.timed_out_players  # NEW
    )
```

---

### Task 4: Frontend Timer Component

**New File**: `web_frontend/src/components/game/InputTimer.tsx`

**4.1** Create countdown timer component
```typescript
import React, { useEffect, useState } from 'react';

interface InputTimerProps {
  startTime: string | null;  // ISO timestamp
  timeoutSeconds: number;
  onTimeout: () => void;
}

export const InputTimer: React.FC<InputTimerProps> = ({
  startTime,
  timeoutSeconds,
  onTimeout,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(timeoutSeconds);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (!startTime) return;

    const calculateTimeRemaining = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsed = (now - start) / 1000;
      const remaining = Math.max(0, timeoutSeconds - elapsed);
      return remaining;
    };

    // Update timer every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining === 0 && !hasTimedOut) {
        setHasTimedOut(true);
        onTimeout();
      }
    }, 1000);

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    return () => clearInterval(interval);
  }, [startTime, timeoutSeconds, hasTimedOut, onTimeout]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const isUrgent = timeRemaining <= 30;

  return (
    <div className={`text-center p-4 rounded-lg border-4 ${
      isUrgent
        ? 'border-red-500 bg-red-500 bg-opacity-20 animate-pulse'
        : 'border-primary bg-primary bg-opacity-20'
    }`}>
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-6 h-6 text-accent-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={`font-black text-2xl uppercase tracking-wide ${
          isUrgent ? 'text-red-400' : 'text-accent-white'
        }`}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
      <p className="text-accent-white font-bold text-sm uppercase tracking-wide mt-2">
        {hasTimedOut ? 'Time\'s Up!' : 'Time Remaining'}
      </p>
    </div>
  );
};
```

---

### Task 5: Frontend Game Page Updates

**File**: `web_frontend/src/pages/Game.tsx`

**5.1** Add timer state and API calls (around line 30)
```typescript
const [timerStartTime, setTimerStartTime] = useState<string | null>(null);
const [timedOutPlayers, setTimedOutPlayers] = useState<string[]>([]);
```

**5.2** Update fetchRoomState to capture timer data (around line 50)
```typescript
const fetchRoomState = async () => {
  if (!roomId) return;

  try {
    const state = await roomsApi.getRoomState(roomId);
    setRoomState(state);

    // NEW: Update timer information
    if (state.phase === GamePhase.PLAYER_INPUT) {
      setTimerStartTime(state.input_phase_start_time);
      setTimedOutPlayers(state.timed_out_players || []);
    }

    // ... rest of existing code ...
  }
  // ... rest of existing code ...
};
```

**5.3** Add timeout handler
```typescript
const handleInputTimeout = async () => {
  if (!roomId) return;

  try {
    await gameplayApi.triggerInputTimeout(roomId);
    await fetchRoomState();
  } catch (err: any) {
    console.error('Failed to handle timeout:', err);
  }
};
```

**5.4** Update Player Input section to include timer (around line 298)
```typescript
{roomState.phase === GamePhase.PLAYER_INPUT && (
  <div className="space-y-6">
    <Card className="bg-accent-black border-4 border-accent-white">
      <div className="mb-6">
        {/* NEW: Timer Display */}
        {timerStartTime && (
          <div className="mb-6">
            <InputTimer
              startTime={timerStartTime}
              timeoutSeconds={120}  // Should come from config/API
              onTimeout={handleInputTimeout}
            />
          </div>
        )}

        {/* Existing content */}
        <h2 className="text-3xl font-black text-primary uppercase tracking-tight mb-4 text-center">
          What Next?
        </h2>
        {/* ... rest of existing code ... */}
      </div>

      <PlayerInput
        onSubmit={handleSubmitInput}
        hasSubmitted={hasSubmittedInput || !!currentInput}
        submissionCount={roomState.player_inputs.length}
        totalPlayers={roomState.players.length}
      />
    </Card>
  </div>
)}
```

**5.5** Add timed out player indicator in voting phase (around line 337)
```typescript
{roomState.phase === GamePhase.VOTING && (
  <div className="space-y-6">
    <Card className="bg-accent-black border-4 border-accent-white">
      <div className="mb-6">
        {/* NEW: Show timed out players */}
        {timedOutPlayers.length > 0 && (
          <div className="bg-red-500 bg-opacity-20 border-2 border-red-500 p-4 rounded-lg mb-6">
            <p className="text-accent-white font-bold text-center">
              ⏰ {timedOutPlayers.join(', ')} did not submit in time
            </p>
          </div>
        )}

        <h2 className="text-3xl font-black text-primary uppercase tracking-tight mb-4 text-center">
          {showResults ? 'Voting Results' : 'Vote For The Best Option'}
        </h2>
        {/* ... rest of existing code ... */}
      </div>

      <VotingPanel
        inputs={roomState.player_inputs}
        currentPlayer={currentPlayer}
        onVote={handleVote}
        hasVoted={hasVoted}
      />
    </Card>
  </div>
)}
```

---

### Task 6: Frontend API Updates

**File**: `web_frontend/src/api/gameplay.ts`

**6.1** Add timeout trigger method
```typescript
export const gameplayApi = {
  // ... existing methods ...

  async triggerInputTimeout(roomId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/timeout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to trigger timeout');
    }

    return response.json();
  },

  async getTimerStatus(roomId: string): Promise<{
    active: boolean;
    time_remaining?: number;
    has_timed_out?: boolean;
    submitted_count?: number;
    total_players?: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/timer`);

    if (!response.ok) {
      throw new Error('Failed to get timer status');
    }

    return response.json();
  },
};
```

---

### Task 7: Frontend Type Updates

**File**: `web_frontend/src/types/game.ts`

**7.1** Update RoomState interface
```typescript
export interface RoomState {
  room_id: string;
  storyline: string;
  players: string[];
  scores: Record<string, number>;
  turn: number;
  phase: GamePhase;
  story_history: StorySegment[];
  player_inputs: PlayerInput[];
  max_turns: number;
  input_phase_start_time?: string | null;  // NEW
  timed_out_players?: string[];  // NEW
}
```

---

### Task 8: MAX_PLAYERS Update to 10

**8.1** Backend README - `backend/README.md`
- Line 17: Change "2-4 players" to "2-10 players"
- Line 144: Change `MAX_PLAYERS | 4` to `MAX_PLAYERS | 10`
- Line 154: Change "2-4 players" to "2-10 players"

**8.2** Root README - `README.md`
- Line 19: Change "2-4 players" to "2-10 players"
- Line 24: Change "2-4 players" to "2-10 players"
- Line 41: Change "2-4 players" to "2-10 players"

**8.3** Game Flow Document - `GAME_FLOW.md`
- Line 3: Change "2–4 players" to "2–10 players"

**Note**: Backend config (`backend/core/config.py:16`) and frontend constants (`web_frontend/src/utils/constants.ts:8`) are already set to 10.

---

## Testing Checklist

### Backend Tests
- [ ] Timer starts when entering PLAYER_INPUT phase
- [ ] Timer correctly calculates remaining time
- [ ] Timeout handler identifies non-submitted players correctly
- [ ] Timed out players are added to `timed_out_players` list
- [ ] Voting phase only includes inputs from non-timed-out players
- [ ] Timed out players cannot vote
- [ ] API endpoints return correct timer status
- [ ] Game advances correctly when timeout occurs with 0 submissions
- [ ] Game advances correctly when timeout occurs with some submissions

### Frontend Tests
- [ ] Timer component displays correct time
- [ ] Timer updates every second
- [ ] Timer shows urgent state (red/pulsing) when < 30 seconds
- [ ] Timeout callback triggers when timer reaches 0
- [ ] Timed out players shown in voting phase
- [ ] Only submitted inputs appear in voting options
- [ ] Timer resets between turns
- [ ] Timer handles server time vs client time differences

### Integration Tests
- [ ] Full game flow with timer timeout
- [ ] Multiple players timing out simultaneously
- [ ] All players timing out (skip voting)
- [ ] Timer persists through page refresh
- [ ] Timer accurate across different time zones

### Edge Cases
- [ ] Player submits at last second
- [ ] Network delay during timeout
- [ ] Player leaves during input phase
- [ ] Timer when game is paused/interrupted

---

## Implementation Order

1. **Phase 1: Backend Foundation**
   - Task 1: Update data models
   - Task 2.1: Initialize timer in set_phase()
   - Task 3.4: Update get_room_state()

2. **Phase 2: Backend Timeout Logic**
   - Task 2.2: Add handle_input_timeout()
   - Task 2.3: Update cast_vote() validation
   - Task 3.1-3.2: Add timer API endpoints

3. **Phase 3: Frontend Timer UI**
   - Task 4: Create InputTimer component
   - Task 7: Update TypeScript types
   - Task 6: Update API client methods

4. **Phase 4: Frontend Integration**
   - Task 5: Integrate timer into Game page
   - Add timed out player indicators

5. **Phase 5: Documentation**
   - Task 8: Update MAX_PLAYERS in all documentation

6. **Phase 6: Testing**
   - Execute all test cases
   - Fix any discovered issues

---

## Technical Considerations

### Time Synchronization
- Backend timer is source of truth
- Frontend polls server for authoritative time remaining
- Client-side timer is for display only, not enforcement

### Race Conditions
- Player submits just as timeout occurs
  - Solution: Accept submission if timestamp < timeout
- Multiple clients trigger timeout simultaneously
  - Solution: Make timeout handler idempotent

### State Recovery
- Player refreshes page during input phase
  - Solution: Timer state recovered from server via getRoomState()
- Server restarts during input phase
  - Solution: In-memory storage lost, game state reset (acceptable for current MVP)

### Performance
- Timer polling every second per client
  - Solution: Use existing game state polling (3 seconds) + local countdown
  - Only trigger timeout once when reaching 0

### User Experience
- Give visual/audio warning at 30 seconds
- Show clear messaging about consequences of timeout
- Display timed out players in voting phase

---

## Future Enhancements

1. **Automatic Timer Management**
   - Backend automatically advances phases after timeout
   - Eliminates need for client-side timeout trigger

2. **Configurable Timeouts**
   - Allow host to set custom timer duration
   - Different timeouts for different storylines

3. **Partial Credit**
   - Allow timed-out players to view voting results
   - Award partial points for quick submissions

4. **Timer Pause**
   - Host can pause/resume timer
   - Timer pauses during technical issues

5. **Voting Timer**
   - Implement similar timeout for voting phase
   - Auto-calculate results when voting times out

6. **Timer Persistence**
   - Use database storage to survive server restarts
   - Timer state persists across deployments

---

## Success Criteria

✅ Timer displays during player input phase
✅ Timer counts down accurately
✅ Players who timeout cannot submit inputs
✅ Timed-out players' inputs excluded from voting
✅ Timed-out players clearly identified in UI
✅ Game advances automatically when timer expires
✅ No inputs = skip voting phase
✅ Some inputs = proceed to voting with available inputs
✅ All documentation updated to reflect MAX_PLAYERS = 10

---

## Estimated Effort

- Backend: 4-6 hours
- Frontend: 4-6 hours
- Testing: 2-3 hours
- Documentation: 1 hour
- **Total**: 11-16 hours

---

*Document created: 2025-10-27*
*Backend: Python/FastAPI*
*Frontend: React/TypeScript*
