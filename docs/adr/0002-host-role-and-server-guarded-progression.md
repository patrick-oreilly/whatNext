# ADR 0002 — Host role and server-guarded turn progression

- **Status:** Accepted
- **Date:** 2026-06-15

## Context

Five turn-control endpoints took only a `room_id` from the URL with no auth or membership
check: `start_game`, `end_game`, `advance_turn`, `trigger_input_timeout`,
`trigger_voting_timeout`. Anyone knowing the 6-char code could start/end a game or
force-advance a turn (locking in votes before others voted). Turn progression is
client-driven (no server-side ticker), so *some* client must poke `/advance` and
`/timeout` for the game to move.

Separately, votes could be changed after results were shown: `cast_vote` gated only on
`phase == VOTING`, while the read path `get_voting_results` → `resolve_voting` already
froze the score tally (`points_awarded_turn`) on the **first results peek** yet recomputed
the winner on every later resolve. Result: points and winner could disagree (the H1
desync), and end-of-round ordering differed between the vote path and the timeout path
(H2).

## Decision

### 1. Two-tier authority, keyed on `player_token`

- **Host-only — lifecycle:** `start_game`, `end_game`. The host is the **first player to
  join**, recorded as `host_token`. On host `leave_room`, **auto-promote the new
  `players[0]`** to host. If the room empties it is already deleted. Host identity is the
  token, so it survives a rename and cannot be spoofed.
- **Any seated member, server-guarded — progression:** `advance_turn`,
  `trigger_input_timeout`, `trigger_voting_timeout`. These accept any member's token, but
  the **server acts only if it independently agrees the phase is over** (deadline elapsed
  per its own clock, or all eligible players have acted). This removes the force-advance
  exploit *and* removes the host's browser as a single point of failure for progression.
- **Owning player, token-checked:** `submit_input`, `cast_vote` (already enforced).

### 2. Voting closes once, freezing winner and tally together

- The server "closes" voting only at a **genuine close** (deadline elapsed, or all
  eligible players voted, or a host/server-driven advance). At close it sets
  `winner_resolved_turn = turn`, freezing **both** the winner and the score tally in the
  same step.
- `cast_vote` is **rejected once `winner_resolved_turn == room.turn`** ("voting closed").
- A **results peek is read-only**: `get_voting_results` must compute a provisional tally
  **without** setting `winner_resolved_turn` or awarding points, so reading results can
  never slam voting shut early.

## Consequences

- C1 (unauthenticated endpoints), H1 (vote-flip desync), and H2 (ordering mismatch) all
  resolve under one server-side "is this phase actually complete?" gate.
- Adds `host_token` to `GameRoom`, assigned on first join and reassigned in `leave_room`.
- Requires separating the read (peek) and write (close) voting paths — `get_voting_results`
  must stop calling the freezing `resolve_voting`.
- Progression resilience no longer depends on the host's tab staying alive/foregrounded.
