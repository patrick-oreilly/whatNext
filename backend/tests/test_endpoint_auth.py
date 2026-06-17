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


@pytest.mark.asyncio
async def test_voting_timeout_requires_member_token():
    room_id, _host, _member = await _room_with_players()
    room = s.room_manager.get_room(room_id)
    room.phase = GamePhase.VOTING
    s.room_manager.save_room(room)

    with pytest.raises(HTTPException) as exc:
        await s.trigger_voting_timeout(room_id, player_token="not-a-real-token")
    assert exc.value.status_code == 403


# -- Host token assignment & succession --------------------------------------

@pytest.mark.asyncio
async def test_first_join_sets_host_token():
    room_id = s.room_manager.create_room(StoryLineType.HOOP_DREAMS, max_turns=5)
    host = await s.join_room(JoinRoomRequest(room_id=room_id, player_name="Alice"))

    room = s.room_manager.get_room(room_id)
    assert room.host_token == host.player_token


@pytest.mark.asyncio
async def test_second_join_does_not_change_host_token():
    room_id, host_token, member_token = await _room_with_players()
    room = s.room_manager.get_room(room_id)

    assert room.host_token == host_token
    assert room.host_token != member_token


@pytest.mark.asyncio
async def test_host_leaving_promotes_next_player():
    room_id, host_token, member_token = await _room_with_players()

    # Host (Alice, players[0]) leaves; Bob should be promoted.
    s.room_manager.remove_player(room_id, "Alice")

    room = s.room_manager.get_room(room_id)
    assert room.players[0] == "Bob"
    assert room.host_token == member_token

    # The new host can now start the game; the old host token is rejected.
    with pytest.raises(HTTPException) as exc:
        s._require_host_token(room, host_token)
    assert exc.value.status_code == 403
    s._require_host_token(room, member_token)  # does not raise


@pytest.mark.asyncio
async def test_non_host_member_leaving_keeps_host_token():
    room_id, host_token, _member = await _room_with_players()

    # Bob (non-host) leaves; Alice remains host.
    s.room_manager.remove_player(room_id, "Bob")

    room = s.room_manager.get_room(room_id)
    assert room.players[0] == "Alice"
    assert room.host_token == host_token


@pytest.mark.asyncio
async def test_require_host_token_uses_stored_host_token():
    """Auth must key off host_token, not merely players[0]'s token."""
    room_id, host_token, member_token = await _room_with_players()
    room = s.room_manager.get_room(room_id)

    # Reorder players so players[0] is no longer the host; auth must still
    # honour the stored host_token rather than the seat order.
    room.players = ["Bob", "Alice"]
    s.room_manager.save_room(room)

    s._require_host_token(room, host_token)  # Alice still host -> ok
    with pytest.raises(HTTPException) as exc:
        s._require_host_token(room, member_token)
    assert exc.value.status_code == 403
