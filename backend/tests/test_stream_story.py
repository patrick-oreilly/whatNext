"""
Regression tests for the story-streaming endpoint (api_server.stream_story).

Covers C1: the per-turn stream de-duplication must not deadlock the *primary*
request, and concurrent requests for the same room+turn must trigger exactly
one generation while every caller still receives the story.
"""
import asyncio
import json
import pytest

import backend.api_server as s
from backend.core.models import GamePhase, StoryLineType


LLM_JSON = (
    '{"paragraph": "You step onto the court as the crowd roars.", '
    '"status": "Tip-off", "decision": "Shoot or pass?", "has_story_ended": false}'
)


def _make_fake_stream(call_counter=None, delay=0.0):
    async def _fake_stream(room_id, message, max_retries=3):
        if call_counter is not None:
            call_counter.append(room_id)
        if delay:
            await asyncio.sleep(delay)
        yield LLM_JSON
    return _fake_stream


@pytest.fixture
def streaming_room(monkeypatch):
    room_id = s.room_manager.create_room(StoryLineType.HOOP_DREAMS, max_turns=5)
    room = s.room_manager.get_room(room_id)
    room.phase = GamePhase.GENERATING_STORY
    room.turn = 1
    room.next_prompt = "Begin the game"
    s.room_manager.save_room(room)
    yield room_id
    # Isolation: the endpoint's cleanup sleeps for 5s before removing the key,
    # so clear it here instead of waiting.
    s.active_streams.clear()
    try:
        s.room_manager.delete_room(room_id)
    except Exception:
        pass


async def _drain(response):
    """Collect SSE chunks, stopping at [DONE] to avoid the endpoint's 5s
    cleanup sleep that runs in the generator's finally block."""
    chunks = []
    async for chunk in response.body_iterator:
        text = chunk if isinstance(chunk, str) else chunk.decode()
        chunks.append(text)
        if "[DONE]" in text or "[ERROR]" in text:
            break
    return "".join(chunks)


def _paragraph_from_sse(body):
    """Reassemble the paragraph text from the 15-char SSE data frames."""
    paragraph = ""
    for line in body.splitlines():
        if not line.startswith("data: "):
            continue
        payload = line[len("data: "):]
        if payload in ("[DONE]", "") or payload.startswith("[ERROR]"):
            continue
        paragraph += json.loads(payload).get("paragraph", "")
    return paragraph


@pytest.mark.asyncio
async def test_primary_stream_does_not_deadlock(streaming_room, monkeypatch):
    """The first (primary) request must return a response promptly rather than
    blocking forever on its own, never-set completion event."""
    monkeypatch.setattr(s.session_manager, "stream_response", _make_fake_stream())

    response = await asyncio.wait_for(s.stream_story(streaming_room), timeout=5)
    body = await asyncio.wait_for(_drain(response), timeout=5)

    assert "You step onto the court as the crowd roars." in _paragraph_from_sse(body)
    assert "[DONE]" in body


@pytest.mark.asyncio
async def test_concurrent_streams_generate_once(streaming_room, monkeypatch):
    """Two simultaneous requests for the same room+turn must produce exactly one
    LLM generation; both callers still receive the story (latecomer replays)."""
    calls = []
    monkeypatch.setattr(
        s.session_manager,
        "stream_response",
        _make_fake_stream(call_counter=calls, delay=0.1),
    )

    async def request_and_drain():
        response = await s.stream_story(streaming_room)
        return await _drain(response)

    bodies = await asyncio.wait_for(
        asyncio.gather(request_and_drain(), request_and_drain()),
        timeout=10,
    )

    assert len(calls) == 1, f"expected one generation, got {len(calls)}"
    for body in bodies:
        assert "You step onto the court as the crowd roars." in _paragraph_from_sse(body)
