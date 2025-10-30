# Voting Phase Timer Functionality

## Configuration & Intended Flow
- The FastAPI backend defines the countdown windows via `backend/core/config.py:18-21`, setting `VOTING_TIMER_SECONDS` to 60 (seconds).  
- Entering the voting phase should stamp `GameRoom.voting_phase_start_time` so clients can compute elapsed time; this happens inside `backend/game_management/room_manager.py:228-243`.
- When the timer expires, clients are expected to call `POST /api/voting/{room_id}/timeout`, which delegates to `room_manager.calculate_winner` and advances play (`backend/api_server.py:397-423`).

In theory, the backend owns the authoritative start time, the frontend renders a countdown, and the timeout endpoint finalizes scoring if players fail to vote.

## Backend Implementation Reality
- `GameRoom` tracks `voting_phase_start_time` (`backend/core/models.py:53-70`), but the API response class omits the field. `RoomStateResponse` (and the serializer in `room_manager.get_room_state`) never expose the timestamp (`backend/core/models.py:142-156`, `backend/game_management/room_manager.py:90-109`).
- No helper mirrors the input-phase utilities (`is_voting_phase_timed_out`, `get_voting_time_remaining`) referenced in planning docs. The only voting timer logic is the manual timeout endpoint, which trusts the caller’s timing.
- Because the server does not surface `voting_phase_start_time`, each poll from `/api/rooms/{room_id}/state` returns no timer metadata. Clients cannot verify server-side expiry or display an authoritative countdown.

## Frontend Behaviour
- `Game.tsx` stores `timerStartTime` from `roomState.voting_phase_start_time` when the phase flips to voting (`web_frontend/src/pages/Game.tsx:108-145`). Without the backend field, this value stays `null`.
- The `VotingTimer` component refuses to start if `startTime` is missing, logging a warning and leaving the countdown idle (`web_frontend/src/components/game/VotingTimer.tsx:22-40`).
- On timeout (either manual user action or a hypothetical timer), `handleVotingTimeout` double-checks the phase, calls `/api/voting/{room_id}/timeout`, pulls results, and refreshes state (`web_frontend/src/pages/Game.tsx:411-447`).

## Observed Gaps & Risks
- The countdown never renders because the backend omits `voting_phase_start_time`; users rely on someone manually pressing a timeout button or waiting for all votes to arrive.
- With no server-calculated remaining time, clients cannot recover from tab suspensions, clock drift, or multiple refreshes. Concurrent clients could disagree about expiry, increasing the chance of duplicate timeout calls (even though the winner calculation is locked).
- There is also no `/api/voting/timer` analogue to the input-phase endpoint, so automated monitoring or tests cannot query timer health.

## Suggested Next Steps
1. Add `voting_phase_start_time` to `RoomStateResponse` and the JSON payload in `get_room_state`, ensuring the frontend receives a timestamp.
2. Mirror the input timer helpers inside `GameRoom` and expose a `GET /api/voting/{room_id}/timer` endpoint that returns remaining seconds and whether the phase auto-elapsed.
3. Update the frontend to default `VotingTimer.timeoutSeconds` to `settings.VOTING_TIMER_SECONDS` once surfaced by the API, and consider hardening against clock skew by periodically re-syncing with the backend timer endpoint.
