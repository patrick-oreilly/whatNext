it# Voting System Fixes - Implementation Guide

## Overview

This document outlines three critical issues in the voting system and provides implementation guidance for fixing them.

**Issues to Fix:**
1. No tie-breaking mechanism when votes are equal
2. Poor UX for timed-out players during voting phase
3. No voting timeout mechanism

---

## Issue 1: Implement Tie-Breaking Mechanism

### Problem
**Location**: `backend/game_management/room_manager.py:608`

When multiple players tie with the same number of votes, Python's `max()` arbitrarily returns the first input, leading to unfair winner determination.

### Current Code
```python
# Line 608
winning_input = max(room.player_inputs, key=lambda inp: inp.votes)
```

### Solution Options

#### Option A: Random Selection (Recommended)
When there's a tie, randomly select from the tied inputs.

```python
import random

def calculate_winner(self, room_id: str) -> VotingResultsResponse:
    """
    Calculate voting results and determine winner

    Returns:
        VotingResultsResponse with winner and vote counts
    """
    room = self.get_room(room_id)

    if not room.player_inputs:
        raise VotingError("No player inputs to vote on")

    # Find the maximum vote count
    max_votes = max(inp.votes for inp in room.player_inputs)

    # Get all inputs with the maximum votes (handles ties)
    tied_inputs = [inp for inp in room.player_inputs if inp.votes == max_votes]

    # Randomly select winner from tied inputs
    winning_input = random.choice(tied_inputs)

    # Log tie-breaking if applicable
    if len(tied_inputs) > 1:
        logger.info(
            f"Tie detected in room {room_id}: {len(tied_inputs)} players with {max_votes} votes. "
            f"Randomly selected '{winning_input.player_name}' as winner."
        )

    # Award points (15 points per vote)
    room.scores[winning_input.player_name] += winning_input.votes * 15

    # Build vote counts
    vote_counts = {
        inp.player_name: inp.votes
        for inp in room.player_inputs
    }

    room.update_activity()
    self.storage.save_room(room)

    logger.info(
        f"Voting winner in room {room_id}: '{winning_input.player_name}' "
        f"with {winning_input.votes} votes"
    )

    return VotingResultsResponse(
        room_id=room_id,
        winning_player=winning_input.player_name,
        winning_input=winning_input.text,
        vote_counts=vote_counts
    )
```

#### Option B: Split Points Among Tied Players
Share the winning points equally among all tied players.

```python
def calculate_winner(self, room_id: str) -> VotingResultsResponse:
    room = self.get_room(room_id)

    if not room.player_inputs:
        raise VotingError("No player inputs to vote on")

    max_votes = max(inp.votes for inp in room.player_inputs)
    tied_inputs = [inp for inp in room.player_inputs if inp.votes == max_votes]

    # Award points split among tied players
    points_per_player = (max_votes * 15) // len(tied_inputs)
    for inp in tied_inputs:
        room.scores[inp.player_name] += points_per_player

    # For response, still need to pick one (or modify response model)
    winning_input = tied_inputs[0]

    if len(tied_inputs) > 1:
        logger.info(
            f"Tie in room {room_id}: {len(tied_inputs)} players split "
            f"{points_per_player} points each"
        )

    vote_counts = {inp.player_name: inp.votes for inp in room.player_inputs}
    room.update_activity()
    self.storage.save_room(room)

    return VotingResultsResponse(
        room_id=room_id,
        winning_player=winning_input.player_name,
        winning_input=winning_input.text,
        vote_counts=vote_counts
    )
```

### Testing

**Test Cases:**
```python
# Test 1: Clear winner (no tie)
# Player A: 3 votes, Player B: 1 vote, Player C: 0 votes
# Expected: Player A wins

# Test 2: Two-way tie
# Player A: 2 votes, Player B: 2 votes, Player C: 0 votes
# Expected: Either A or B wins (random), or both get points (split)

# Test 3: Three-way tie
# Player A: 1 vote, Player B: 1 vote, Player C: 1 vote
# Expected: One random winner, or all get 5 points (15/3)

# Test 4: All zero votes
# Player A: 0 votes, Player B: 0 votes
# Expected: Random selection from all inputs
```

---

## Issue 2: Hide Voting Panel from Timed-Out Players

### Problem
**Location**: `web_frontend/src/pages/Game.tsx:554-559`

Timed-out players can still see and interact with the voting panel, only to receive an error when they try to vote.

### Current Code
```typescript
{showResults && votingResults ? (
  // Results display
) : (
  <VotingPanel
    inputs={roomState.player_inputs}
    currentPlayer={currentPlayer}
    onVote={handleVote}
    hasVoted={hasVoted}
  />
)}
```

### Solution

**Step 1**: Add a check to determine if current player timed out

```typescript
// Add this in the Game component, around line 88
const hasCurrentPlayerTimedOut = useMemo(
  () => timedOutPlayers.includes(currentPlayer || ''),
  [timedOutPlayers, currentPlayer]
);
```

**Step 2**: Create a "Cannot Vote" display component

Add this in the VOTING phase render section (around line 553):

```typescript
{showResults && votingResults ? (
  // Results display...
  <div className="space-y-6">
    {/* existing results code */}
  </div>
) : hasCurrentPlayerTimedOut ? (
  // New: Show message for timed-out players
  <div className="bg-red-500 bg-opacity-20 border-4 border-red-500 rounded-lg p-8 text-center">
    <div className="text-6xl mb-4">⏱️</div>
    <h3 className="text-3xl font-black text-accent-white uppercase mb-4">
      You Cannot Vote
    </h3>
    <p className="text-accent-white font-bold text-lg mb-4">
      You did not submit an input during the input phase, so you cannot participate in voting.
    </p>
    <p className="text-accent-white font-semibold text-base uppercase tracking-wide">
      Waiting for others to vote...
    </p>
  </div>
) : (
  // Existing voting panel
  <VotingPanel
    inputs={roomState.player_inputs}
    currentPlayer={currentPlayer}
    onVote={handleVote}
    hasVoted={hasVoted}
  />
)}
```

**Step 3**: Update VotingPanel to filter out timed-out inputs (optional enhancement)

In `web_frontend/src/components/game/VotingPanel.tsx`, add a prop:

```typescript
interface VotingPanelProps {
  inputs: PlayerInput[];
  currentPlayer: string | null;
  onVote: (chosenPlayer: string) => Promise<void>;
  hasVoted: boolean;
  timedOutPlayers?: string[]; // New prop
}

export const VotingPanel: React.FC<VotingPanelProps> = ({
  inputs,
  currentPlayer,
  onVote,
  hasVoted,
  timedOutPlayers = [], // Default to empty array
}) => {
  // Filter inputs to only show those from eligible players
  const eligibleInputs = inputs.filter(
    (input) => !timedOutPlayers.includes(input.player_name)
  );

  // Then use eligibleInputs instead of inputs in the render
  return (
    <div>
      {hasVoted ? (
        // ... existing code
      ) : (
        <div>
          <div className="space-y-4 mb-6">
            {eligibleInputs
              .filter((input) => input.player_name !== currentPlayer)
              .map((input, index) => (
                // ... existing button code
              ))}

            {eligibleInputs.filter((i) => i.player_name !== currentPlayer).length === 0 && (
              <div className="text-center py-12 bg-accent-white bg-opacity-10 rounded-lg">
                <div className="text-6xl mb-4">🤷</div>
                <p className="text-accent-white font-bold text-lg uppercase tracking-wide">
                  No options to vote for
                </p>
              </div>
            )}
          </div>
          {/* ... rest of component */}
        </div>
      )}
    </div>
  );
};
```

**Step 4**: Update the VotingPanel call in Game.tsx:

```typescript
<VotingPanel
  inputs={roomState.player_inputs}
  currentPlayer={currentPlayer}
  onVote={handleVote}
  hasVoted={hasVoted}
  timedOutPlayers={timedOutPlayers} // Add this prop
/>
```

### Testing

**Test Scenarios:**
1. **Normal player** → Should see voting panel with all eligible options
2. **Timed-out player** → Should see "You Cannot Vote" message, not the panel
3. **Player who submitted** → Should be able to vote
4. **After voting** → Should see "Vote Submitted" message

---

## Issue 3: Implement Voting Timeout

### Problem
**Location**: Multiple files

The voting phase has no timeout, allowing games to get stuck indefinitely if a player doesn't vote.

### Solution Overview

Implement a voting timer similar to the existing input timer:
1. Backend tracks when voting phase starts
2. Frontend displays countdown timer
3. After timeout, automatically advance turn using current vote counts
4. Any players who didn't vote are marked (optional)

### Implementation

#### Backend Changes

**Step 1**: Add voting phase timer field to GameRoom model

`backend/core/models.py`:

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
    next_prompt: Optional[str] = None
    voting_phase_start_time: Optional[datetime] = None  # NEW FIELD

    # ... existing methods ...

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
```

**Step 2**: Update RoomStateResponse model

`backend/core/models.py`:

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
    input_phase_start_time: Optional[datetime] = None
    timed_out_players: List[str] = []
    voting_phase_start_time: Optional[datetime] = None  # NEW FIELD
```

**Step 3**: Set voting_phase_start_time when entering voting

`backend/game_management/room_manager.py`:

Update the `set_phase` method (around line 210):

```python
def set_phase(self, room_id: str, phase: GamePhase) -> None:
    """Set game phase"""
    room = self.get_room(room_id)
    room.phase = phase

    # Start input phase timer
    if phase == GamePhase.PLAYER_INPUT:
        room.input_phase_start_time = datetime.now()
        room.timed_out_players = []  # Reset timeout tracking

    # NEW: Start voting phase timer
    if phase == GamePhase.VOTING:
        room.voting_phase_start_time = datetime.now()

    room.update_activity()
    self.storage.save_room(room)
    logger.debug(f"Room {room_id} phase changed to {phase}")
```

Also update in `handle_input_timeout` (around line 279):

```python
if len(room.player_inputs) > 1:
    # Multiple submissions: proceed to voting
    logger.info(f"   → Path 1: MULTIPLE INPUTS ({len(room.player_inputs)}) - advancing to VOTING")
    room.phase = GamePhase.VOTING
    room.voting_phase_start_time = datetime.now()  # NEW LINE
    room.update_activity()
    # ...
```

And in `submit_player_input` (around line 498):

```python
if len(room.player_inputs) == len(room.players):
    # All players submitted - automatically advance to voting
    logger.info(f"🎉 ALL PLAYERS SUBMITTED!")
    logger.info(f"   → Automatically advancing to VOTING phase")
    room.phase = GamePhase.VOTING
    room.voting_phase_start_time = datetime.now()  # NEW LINE
    # ...
```

**Step 4**: Add voting timeout endpoint

`backend/api_server.py`:

```python
@app.post("/api/voting/{room_id}/timeout")
async def trigger_voting_timeout(room_id: str):
    """
    Manually trigger voting phase timeout

    Used when timer expires on client side.
    Calculates winner based on current votes and advances turn.
    """
    logger.info("=" * 80)
    logger.info(f"🔥 VOTING TIMEOUT ENDPOINT CALLED for room {room_id}")
    logger.info("=" * 80)

    try:
        room = room_manager.get_room(room_id)
        logger.info(f"📊 Room state BEFORE timeout handling:")
        logger.info(f"   - Phase: {room.phase}")
        logger.info(f"   - Player inputs: {len(room.player_inputs)}")

        # Validate phase
        if room.phase != GamePhase.VOTING:
            logger.error(f"❌ Cannot handle timeout - current phase is {room.phase}")
            return {
                "status": "error",
                "message": f"Not in voting phase (current: {room.phase})"
            }

        # Calculate winner with current votes (even if not everyone voted)
        logger.info(f"📊 Calculating winner with current votes...")
        results = room_manager.calculate_winner(room_id)
        logger.info(f"🏆 Winner: {results.winning_player} with {results.vote_counts[results.winning_player]} votes")

        # The turn advancement will happen on the frontend when they call /api/turn/advance

        logger.info("=" * 80)
        return {
            "status": "timeout_handled",
            "room_id": room_id,
            "winner": results.winning_player
        }

    except Exception as e:
        logger.error(f"❌ ERROR in voting timeout endpoint: {e}", exc_info=True)
        raise
```

**Step 5**: Add voting timer status endpoint

`backend/api_server.py`:

```python
@app.get("/api/voting/{room_id}/timer")
async def get_voting_timer(room_id: str):
    """
    Get current voting phase timer status

    Returns:
    - time_remaining: Seconds remaining in voting phase
    - has_timed_out: Whether phase has timed out
    - vote_count: Number of players who voted
    - total_eligible: Number of eligible voters
    """
    room = room_manager.get_room(room_id)

    if room.phase != GamePhase.VOTING:
        return {
            "active": False,
            "message": "Voting phase not active"
        }

    time_remaining = room.get_voting_time_remaining(settings.VOTING_TIMER_SECONDS)
    has_timed_out = room.is_voting_phase_timed_out(settings.VOTING_TIMER_SECONDS)

    # Count unique voters
    voters = set()
    for inp in room.player_inputs:
        voters.update(inp.voters)

    # Calculate eligible voters (exclude timed-out players)
    eligible = [p for p in room.players if p not in room.timed_out_players]

    return {
        "active": True,
        "time_remaining": time_remaining,
        "has_timed_out": has_timed_out,
        "timeout_seconds": settings.VOTING_TIMER_SECONDS,
        "vote_count": len(voters),
        "total_eligible": len(eligible)
    }
```

**Step 6**: Update get_room_state response

`backend/game_management/room_manager.py`:

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
        input_phase_start_time=room.input_phase_start_time,
        timed_out_players=room.timed_out_players,
        voting_phase_start_time=room.voting_phase_start_time  # NEW FIELD
    )
```

#### Frontend Changes

**Step 1**: Add voting_phase_start_time to types

`web_frontend/src/types/api.ts`:

```typescript
export interface RoomStateResponse {
  room_id: string;
  storyline: StoryLineType;
  players: string[];
  scores: Record<string, number>;
  turn: number;
  phase: GamePhase;
  story_history: StorySegment[];
  player_inputs: PlayerInput[];
  max_turns: number;
  input_phase_start_time?: string | null;
  timed_out_players: string[];
  voting_phase_start_time?: string | null; // NEW FIELD
}
```

**Step 2**: Create VotingTimer component

`web_frontend/src/components/game/VotingTimer.tsx`:

```typescript
import React, { useEffect, useState } from 'react';

interface VotingTimerProps {
  startTime: string | null;
  onTimeout: () => void;
  timeoutSeconds?: number;
}

export const VotingTimer: React.FC<VotingTimerProps> = ({
  startTime,
  onTimeout,
  timeoutSeconds = 60,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(timeoutSeconds);
  const [hasTriggeredTimeout, setHasTriggeredTimeout] = useState(false);

  useEffect(() => {
    if (!startTime) {
      setTimeRemaining(timeoutSeconds);
      setHasTriggeredTimeout(false);
      return;
    }

    const startTimestamp = new Date(startTime).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - startTimestamp) / 1000;
      const remaining = Math.max(0, timeoutSeconds - elapsed);

      setTimeRemaining(remaining);

      // Trigger timeout callback when time runs out
      if (remaining === 0 && !hasTriggeredTimeout) {
        setHasTriggeredTimeout(true);
        onTimeout();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, timeoutSeconds, onTimeout, hasTriggeredTimeout]);

  const percentage = (timeRemaining / timeoutSeconds) * 100;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);

  // Color based on time remaining
  const getColor = () => {
    if (percentage > 50) return 'bg-primary';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (percentage > 50) return 'text-primary';
    if (percentage > 25) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-accent-black border-4 border-accent-white rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-accent-white font-bold uppercase text-sm tracking-wide">
          Voting Time
        </span>
        <span className={`font-black text-lg ${getTextColor()}`}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-accent-white bg-opacity-20 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {timeRemaining < 10 && timeRemaining > 0 && (
        <p className="text-red-500 font-bold text-center mt-2 uppercase text-xs animate-pulse">
          Hurry! Time is running out!
        </p>
      )}
    </div>
  );
};
```

**Step 3**: Add voting timeout API call

`web_frontend/src/api/gameplay.ts`:

```typescript
export const gameplayApi = {
  // ... existing methods ...

  /**
   * Trigger voting phase timeout
   */
  triggerVotingTimeout: async (roomId: string): Promise<void> => {
    await apiClient.post(`/api/voting/${roomId}/timeout`);
  },
};
```

**Step 4**: Add VotingTimer to Game.tsx

In the VOTING phase section (around line 484):

```typescript
{roomState.phase === GamePhase.VOTING && (
  <div className="space-y-6">
    <Card className="bg-accent-black border-4 border-accent-white">
      <div className="mb-6">
        {/* NEW: Add voting timer */}
        {!showResults && (
          <VotingTimer
            startTime={roomState.voting_phase_start_time}
            onTimeout={handleVotingTimeout}
            timeoutSeconds={60}
          />
        )}

        {timedOutPlayers.length > 0 && (
          // ... existing timeout warning
        )}

        {/* ... rest of voting UI */}
      </div>
    </Card>
  </div>
)}
```

**Step 5**: Add voting timeout handler

In `Game.tsx`, add this handler:

```typescript
const handleVotingTimeout = async () => {
  console.log('⏰ [Game] Voting timeout triggered!');

  if (!roomId) {
    console.error('❌ [Game] Missing roomId, aborting voting timeout handler');
    return;
  }

  try {
    // Check current phase before calling timeout
    console.log('🔄 [Game] Checking current phase before timeout call...');
    const updatedRoom = await roomsApi.getRoomState(roomId);
    console.log('📊 [Game] Current phase:', updatedRoom.phase);

    // Only call timeout handler if still in VOTING phase
    if (updatedRoom.phase === GamePhase.VOTING) {
      console.log('📞 [Game] Phase is VOTING, calling timeout handler...');
      await gameplayApi.triggerVotingTimeout(roomId);
      console.log('✅ [Game] Voting timeout handled');

      // Fetch results automatically
      await fetchVotingResults();

      // Refresh state
      console.log('🔄 [Game] Fetching updated state...');
      await fetchRoomState();
      console.log('✅ [Game] State refreshed');
    } else {
      console.log('⏩ [Game] Phase already advanced to', updatedRoom.phase);
      await fetchRoomState();
    }
  } catch (e) {
    console.error('❌ [Game] Voting timeout handling error:', e);
    setError('An error occurred while handling the voting timeout.');
  }
};
```

**Step 6**: Import VotingTimer component

At the top of `Game.tsx`:

```typescript
import { VotingTimer } from '../components/game/VotingTimer';
```

### Testing

**Test Scenarios:**

1. **Normal voting completion** → All players vote before timer expires, results show normally
2. **Voting timeout with some votes** → Timer expires with 2/3 players voted, winner calculated with available votes
3. **Voting timeout with no votes** → Timer expires with 0 votes, first input wins (or random with tie-breaking fix)
4. **Late vote after timeout** → Player tries to vote after timeout, should get error or be ignored
5. **Timer accuracy** → Verify timer displays correctly and counts down properly
6. **Multi-instance sync** → Multiple clients should see same timer countdown

---

## Testing Checklist

### Overall Integration Tests

- [ ] **Tie scenario + timed-out UX**: 2 players tie, 1 player timed out → verify random winner and timed-out player sees correct message
- [ ] **All fixes together**: Voting timeout occurs with a tie → verify random selection and proper UI
- [ ] **Edge case**: Single player submits, others timeout → verify auto-advance and correct winner
- [ ] **Edge case**: All players timeout on input → verify natural continuation generated
- [ ] **Edge case**: Voting timeout with 0 votes → verify tie-breaking handles all-zero scenario

---

## Migration Notes

### Database/Storage
- If using persistent storage, you may need to handle existing rooms that don't have `voting_phase_start_time`
- The field is optional (`Optional[datetime]`), so existing rooms will have `None` (no timer active)

### Configuration
- The `VOTING_TIMER_SECONDS` setting in `backend/core/config.py` is already defined (60 seconds)
- Consider making it configurable per room if needed

### Backwards Compatibility
- All changes are backwards compatible
- Existing rooms will continue to work (they just won't have voting timeouts until they enter voting phase again)
- Frontend gracefully handles missing `voting_phase_start_time` field

---

## Rollout Recommendations

1. **Deploy in order**:
   - Deploy Issue 1 fix first (tie-breaking) - lowest risk, high impact
   - Deploy Issue 2 fix second (UX improvement) - medium risk, high UX improvement
   - Deploy Issue 3 fix last (voting timeout) - highest complexity, test thoroughly

2. **Monitor**:
   - Track tie-breaking events in logs
   - Monitor voting timeout occurrences
   - Check for any stuck games after deployment

3. **Announce**:
   - Inform players about voting timeout feature (60 seconds)
   - Explain tie-breaking is now random/fair
   - Set expectations for timed-out players

---

## Additional Enhancements (Optional)

### Enhancement 1: Configurable Voting Timer
Allow room creator to set voting timer duration:

```python
# In CreateRoomRequest
voting_timeout: int = Field(default=60, ge=30, le=180)
```

### Enhancement 2: Show Who Hasn't Voted
Display which players still need to vote (without revealing who they voted for):

```typescript
const playersWhoVoted = new Set(
  roomState.player_inputs.flatMap(input => input.voters)
);
const eligiblePlayers = roomState.players.filter(
  p => !timedOutPlayers.includes(p)
);
const playersWhoHaventVoted = eligiblePlayers.filter(
  p => !playersWhoVoted.has(p)
);
```

### Enhancement 3: Voting Results Show Tie Indicator
When a tie occurred, show it in the results:

```typescript
{votingResults.was_tie && (
  <p className="text-yellow-500 font-bold text-sm mt-2">
    This was a tie! Winner selected randomly.
  </p>
)}
```

---

## Questions for Product/Design

1. **Tie-breaking**: Do we want random selection or point splitting? Or show both options to users?
2. **Voting timeout duration**: Is 60 seconds appropriate, or should it be longer/shorter?
3. **Timeout messaging**: Should we track and display players who didn't vote (similar to input timeout)?
4. **Grace period**: Should there be a grace period if someone is actively voting when timer expires?
5. **Sound/notification**: Should voting timer play a sound when time is almost up?

---

## Estimated Effort

- **Issue 1** (Tie-breaking): 1-2 hours (backend only)
- **Issue 2** (UX for timed-out players): 2-3 hours (frontend changes + testing)
- **Issue 3** (Voting timeout): 4-6 hours (backend + frontend + thorough testing)

**Total**: 7-11 hours for all three fixes

---

## Document Version
- **Version**: 1.0
- **Created**: 2025-10-30
- **Last Updated**: 2025-10-30
