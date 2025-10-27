# Bug: Story Does Not Continue After First Round

## Priority
**HIGH** - Blocks core game flow

## Description
After the first round of the game is completed and a prompt/submission has been selected during the voting phase, the story does not continue to the next round. The game appears to stall or hang instead of progressing to round 2.

## Expected Behavior
1. Players submit their story continuations in round 1
2. Players vote for their favorite submission
3. The winning submission is selected
4. Game automatically transitions to round 2 with the updated story context
5. Players are prompted to continue the story from the newly selected continuation
6. Process repeats for all configured turns

## Actual Behavior
- After voting completes in round 1 and a submission is selected
- The game does not progress to round 2
- Story remains stuck or players are not prompted for the next round

## Steps to Reproduce
1. Create a new game room with any configuration
2. Have 2+ players join the lobby
3. Start the game
4. Complete round 1:
   - Wait for initial story generation
   - All players submit their story continuations
   - All players vote for a submission
5. Observe that the game does not proceed to round 2

## Impact
- Core game loop is broken
- Games cannot progress beyond the first round
- Severely impacts user experience

## Areas to Investigate

### Backend (`/backend`)

#### 1. Game State Management (`game_management/room_manager.py`)
- Check the `advance_phase()` method - is it properly handling the transition from voting to the next round?
- Verify `_handle_voting_complete()` logic - does it correctly:
  - Select the winning submission?
  - Update the story context with the selected continuation?
  - Increment the current turn counter?
  - Transition to the next `player_input` phase?
- Review the phase transition state machine
- Check if turn counter is being incremented properly

#### 2. API Endpoints (`api_server.py`)
- Verify the `/rooms/{room_id}/vote` endpoint properly triggers phase advancement
- Check if there's a separate endpoint for advancing rounds that might not be called
- Review polling/websocket mechanisms for state updates

#### 3. Story Context Management (`core/models.py`)
- Verify `StoryContext` is properly updated with the selected submission
- Check if the story history is being maintained correctly
- Ensure the current story state includes the winning submission for the next round

### Frontend (`/web_frontend`)

#### 4. Game State Polling (`src/pages/Game.tsx` or similar)
- Check if the frontend is properly polling for game state updates
- Verify phase change detection logic
- Review the game state synchronization mechanism
- Look for any race conditions in state updates

#### 5. Phase Transition Handling
- Review how the frontend handles the transition from `voting` to `player_input` phase
- Check if there are any UI blocking conditions preventing the next round from displaying
- Verify the turn counter is being read and displayed correctly

### Potential Root Causes

1. **Phase not advancing**: The backend might not be transitioning from `voting` back to `player_input` phase
2. **Turn counter not incrementing**: Game might think it's complete after round 1
3. **Story context not updating**: The winning submission might not be added to the story context
4. **Frontend not detecting change**: UI might not be polling or updating when the phase changes
5. **Timing issue**: Race condition between vote processing and phase advancement
6. **Missing trigger**: The mechanism to advance to the next round after voting might not be implemented or called

## Debugging Steps

1. **Add logging**:
   - Log phase transitions in `room_manager.py`
   - Log turn increments
   - Log story context updates
   - Log frontend phase change detections

2. **Check database/state**:
   - Inspect room state after voting completes
   - Verify current_turn value
   - Check phase value
   - Review story_context contents

3. **Test voting completion handler**:
   - Add breakpoints in voting completion logic
   - Verify all votes are counted
   - Confirm winning submission is identified
   - Ensure phase transition is triggered

4. **Monitor frontend**:
   - Check browser console for errors
   - Monitor network requests during the transition
   - Verify game state API responses

## Related Files
- `backend/game_management/room_manager.py` - Main game state management
- `backend/api_server.py` - API endpoints
- `backend/core/models.py` - Data models and game state
- `web_frontend/src/pages/Game.tsx` - Main game UI component
- `web_frontend/src/store/gameStore.ts` - Frontend state management
- `web_frontend/src/api/rooms.ts` - API client

## Additional Context
- Check `GAME_FLOW.md` for expected game flow documentation
- Review any existing timer/timeout mechanisms that might affect phase transitions
- Consider if the recent timer feature (`TIMER_TIMEOUT_TASK.md`) interacts with this bug

## Success Criteria
- [ ] After voting completes in round 1, game automatically advances to round 2
- [ ] Story context is properly updated with the winning submission
- [ ] Players see the continued story and can submit their next continuation
- [ ] Game successfully completes all configured turns (e.g., 10 turns)
- [ ] No manual intervention required to progress between rounds

---

## ✅ BUG FIXED

### Root Cause Identified
The frontend voting completion logic in `web_frontend/src/pages/Game.tsx:85-112` was checking if **all players** had voted, but the backend prevents **timed-out players** from voting. This created an impossible condition when any player timed out during the input phase.

**The specific issue:**
```typescript
// OLD CODE (WRONG):
const allVoted = uniqueVoters.size === state.players.length;  // ❌
```

This compared the number of voters against **all players**, including those who timed out and are not allowed to vote.

### The Fix Applied
Updated the vote completion check to exclude timed-out players:

```typescript
// NEW CODE (CORRECT):
const eligibleVoters = state.players.filter(
  player => !state.timed_out_players.includes(player)
);
const allVoted = uniqueVoters.size === eligibleVoters.length;  // ✅
```

**File Changed:** `web_frontend/src/pages/Game.tsx` (lines 92-98)

### How It Works Now
1. When checking if voting is complete, the frontend calculates **eligible voters** by excluding players in `state.timed_out_players`
2. The `allVoted` condition now correctly compares against only those who can actually vote
3. When all eligible voters have voted, the results are automatically fetched and displayed
4. The "Continue Story" button appears and the game can progress to the next round

### Scenarios Now Handled
- ✅ All players submit on time → All players vote → Game continues
- ✅ Some players time out → Only those who submitted can vote → Game continues when eligible voters finish
- ✅ Edge case: If no one submits, backend advances turn automatically (already working)

### Testing Recommendations
1. Test with all players submitting on time (normal flow)
2. Test with 1+ players timing out during input phase
3. Test with all players timing out
4. Verify the game completes all configured turns without getting stuck

---

## ✅ ADDITIONAL BUG FIXED - Stream Caching Issue

### Second Root Cause Identified
After implementing the timer feature, a **stream caching race condition** was introduced that prevented the game from advancing past round 1. The issue was in `backend/api_server.py:419-527`.

**The specific issue:**
```python
# OLD CODE (WRONG):
active_streams[room_id] = {"response": []}  # ❌ Only uses room_id
```

When turn 2 started, the backend would:
1. Check if `room_id` exists in `active_streams`
2. Find turn 1's cached stream (5-second cleanup delay)
3. Replay turn 1's story instead of generating turn 2's story
4. Game appears stuck showing old content

### The Fix Applied
Updated the stream cache to use turn-specific keys:

```python
# NEW CODE (CORRECT):
stream_key = f"{room_id}_turn_{room.turn}"  # ✅ Unique per turn
active_streams[stream_key] = {"response": []}
```

**Files Changed:**
- `backend/api_server.py` (lines 440, 466, 488, 520)

### How It Works Now
1. Each turn gets its own cache key: `"UYIQQM_turn_1"`, `"UYIQQM_turn_2"`, etc.
2. Turn 2 stream request creates new cache entry instead of using turn 1's
3. AI generates fresh story for each turn
4. Game progresses normally through all turns

### Why This Happened
- Before timer feature: Slower phase transitions gave the 5-second cache cleanup time to complete
- After timer feature: Faster/more predictable transitions caused turn 2 to start before turn 1 cache cleared
- Race condition became reproducible instead of intermittent
