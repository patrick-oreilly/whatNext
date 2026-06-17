# ADR 0001 — Single instance, volatile in-memory state

- **Status:** Accepted
- **Date:** 2026-06-15

## Context

Room state lives in one process's heap (`InMemoryStorage._rooms`) and concurrency is
serialized with per-process `asyncio.Lock`s (`room_manager._room_locks`). ADK sessions
and the `active_streams` map are likewise per-process. `cloud-run-config.yaml` is present,
and Cloud Run autoscales by default — so a second instance would split room state
(`RoomNotFoundError` for half the players) and the locks would protect nothing across
instances.

## Decision

Run as a **single instance**. Volatile state and per-process locks are an **accepted
constraint**, not a defect:

- Pin the deployment to one instance (`maxScale: 1`) so autoscaling cannot silently break
  state by spawning a second instance.
- Accept that a restart or crash wipes in-flight games. The product is small-scale; this
  is tolerable.

## Consequences

- The in-memory `player_token` auth model (ADR 0002) remains viable — no shared session
  store required.
- Horizontal scale and restart-durability are explicitly **out of scope**, deferred to a
  future epic that would move room state and locks to a shared backend (e.g. Redis for
  both state and distributed locks) and rework the ADK session / `active_streams` model.
- Anyone touching `cloud-run-config.yaml` must preserve the `maxScale: 1` pin; removing it
  is a correctness regression, not a tuning change.
