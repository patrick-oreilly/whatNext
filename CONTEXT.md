# What Next? — Domain Context

A multiplayer AI storytelling game. Players join a room, the AI generates a story
segment, players submit competing continuations, everyone votes, and the winning
continuation feeds the next AI segment. Repeat until the story ends.

## Core vocabulary

- **Room** — a single game session, identified by a 6-character `room_id`. Holds all
  state: players, scores, turn, phase, story history, and the current turn's inputs.
- **Player** — identified to humans by `player_name` (unique within a room,
  case-insensitive). The **unspoofable identity is the `player_token`** issued at join
  (`player_tokens` maps name → token). Auth and ownership checks use the token, never
  the name.
- **Host** — the room's owner for **lifecycle** actions only (see ADR 0002). The host is
  the **first player to join** the room, recorded as `host_token`. On host departure the
  new `players[0]` is auto-promoted.
- **Turn** — one full cycle: generate → player input → voting → resolve → advance.
- **Phase** (`GamePhase`) — `LOBBY → GENERATING_STORY → PLAYER_INPUT → VOTING → GAME_OVER`.
- **Input** (`PlayerInput`) — a player's proposed continuation for the current turn,
  carrying its `votes` and `voters`.
- **Resolve / close voting** — the moment the server decides the voting phase is over,
  freezes the winner *and* the score tally together, and stops accepting votes. Distinct
  from a read-only **results peek**, which never mutates state (see ADR 0002).

## Runtime shape (deliberate constraints)

- **Single instance, volatile state.** Room state lives in one process's heap
  (`InMemoryStorage`) and locks are per-process `asyncio.Lock`s. This is a deliberate
  accepted constraint, not a bug — see ADR 0001. Horizontal scale is a separate future
  epic.
- **Client-driven turn progression.** No server-side ticker. Clients POST `/timeout` and
  `/advance` to move the game forward; the **server is the authority on *when* a phase may
  actually advance** (deadline elapsed or all eligible players acted) — see ADR 0002.

## Authority model (summary — see ADR 0002)

- **Host-only:** `start_game`, `end_game`.
- **Any seated member, gated by a server-side phase guard:** `advance_turn`,
  `trigger_input_timeout`, `trigger_voting_timeout`.
- **Owning player, token-checked:** `submit_input`, `cast_vote`.
