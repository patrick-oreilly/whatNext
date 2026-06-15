"""
Authorization tests for room-level mutating endpoints (audit H2).

Host-only:   start, end, delete
Member-only: advance, input timeout, voting timeout
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

import backend.api_server as s
from backend.core.models import GamePhase, StoryLineType, JoinRoomRequest


async def _room_with_players():
    """Create a room with Alice (host) and Bob (member); return their tokens."""
    room_id = s.room_manager.create_room(StoryLineType.HOOP_DREAMS, max_turns=5)
    host = await s.join_room(JoinRoomRequest(room_id=room_id, player_name="Alice"))
    member = await s.join_room(JoinRoomRequest(room_id=room_id, player_name="Bob"))
    return room_id, host.player_token, member.player_token


# -- Host-only endpoints ----------------------------------------------------

@pytest.mark.asyncio
async def test_start_game_requires_host_token():
    room_id, _host, member = await _room_with_players()

    with pytest.raises(HTTPException) as none_exc:
        await s.start_game(room_id, player_token=None)
    assert none_exc.value.status_code == 403

    with pytest.raises(HTTPException) as member_exc:
        await s.start_game(room_id, player_token=member)  # Bob is not the host
    assert member_exc.value.status_code == 403


@pytest.mark.asyncio
async def test_start_game_allows_host(monkeypatch):
    room_id, host, _member = await _room_with_players()
    monkeypatch.setattr(
        s.session_manager,
        "create_session",
        AsyncMock(return_value=SimpleNamespace(session=SimpleNamespace(id="sess-1"))),
    )

    resp = await s.start_game(room_id, player_token=host)

    assert resp["status"] == "started"


@pytest.mark.asyncio
async def test_end_game_requires_host_token():
    room_id, host, member = await _room_with_players()

    with pytest.raises(HTTPException) as exc:
        await s.end_game(room_id, player_token=member)
    assert exc.value.status_code == 403

    resp = await s.end_game(room_id, player_token=host)
    assert resp["status"] == "game_ended"


@pytest.mark.asyncio
async def test_delete_room_requires_host_token():
    room_id, host, _member = await _room_with_players()

    with pytest.raises(HTTPException) as exc:
        await s.delete_room(room_id, player_token=None)
    assert exc.value.status_code == 403

    resp = await s.delete_room(room_id, player_token=host)
    assert resp["status"] == "deleted"


# -- Member endpoints -------------------------------------------------------

@pytest.mark.asyncio
async def test_advance_turn_rejects_foreign_token():
    room_id, _host, _member = await _room_with_players()
    room = s.room_manager.get_room(room_id)
    room.phase = GamePhase.VOTING
    s.room_manager.save_room(room)

    with pytest.raises(HTTPException) as exc:
        await s.advance_turn(room_id, player_token="not-a-real-token")
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_advance_turn_allows_any_member():
    room_id, _host, member = await _room_with_players()
    room = s.room_manager.get_room(room_id)
    room.phase = GamePhase.VOTING
    s.room_manager.save_room(room)

    resp = await s.advance_turn(room_id, player_token=member)

    assert resp["status"] == "turn_advanced"


@pytest.mark.asyncio
async def test_input_timeout_requires_member_token():
    room_id, _host, _member = await _room_with_players()
    room = s.room_manager.get_room(room_id)
    room.phase = GamePhase.PLAYER_INPUT
    s.room_manager.save_room(room)

    with pytest.raises(HTTPException) as exc:
        await s.trigger_input_timeout(room_id, player_token=None)
    assert exc.value.status_code == 403
