"""
Regression test: verify player_token must be sent in the JSON body, not as a
query parameter, for endpoints changed to Body(embed=True) in PR #47.

If a client sends ?player_token=xxx, the endpoint receives player_token=None
and returns 403.
"""

import pytest
from fastapi.testclient import TestClient

import backend.api_server as s
from backend.core.models import StoryLineType, GamePhase


@pytest.fixture
def client():
    return TestClient(s.app)


def _room_with_player():
    """Create a room, join with Alice, return (room_id, token)."""
    room_id = s.room_manager.create_room(StoryLineType.HOOP_DREAMS, max_turns=5)
    resp = s.room_manager.storage.get_room(room_id)
    return room_id


@pytest.mark.asyncio
async def test_query_param_token_rejected_on_body_endpoint(client):
    """Sending player_token as query param to an endpoint using Body(embed=True)
    results in player_token=None, which the auth guard rejects with 403."""
    room_id = _room_with_player()

    # Join: get a valid token
    resp = client.post("/api/rooms/join", json={"room_id": room_id, "player_name": "Alice"})
    assert resp.status_code == 200, resp.text
    token = resp.json()["player_token"]

    # Set phase so trigger_input_timeout can fire
    room = s.room_manager.get_room(room_id)
    room.phase = GamePhase.PLAYER_INPUT
    s.room_manager.save_room(room)

    # SCENARIO A: token in JSON body → success (200)
    resp_body = client.post(
        f"/api/rooms/{room_id}/timeout",
        json={"player_token": token},
    )
    assert resp_body.status_code == 200, (
        f"Body token should succeed, got {resp_body.status_code}: {resp_body.text}"
    )

    # SCENARIO B: token as query param → 403 (THE BUG)
    # Reset room phase for second attempt
    room.phase = GamePhase.PLAYER_INPUT
    # Need fresh input_start_time so timeout isn't "already handled"
    room.input_phase_start_time = None
    s.room_manager.save_room(room)

    resp_query = client.post(
        f"/api/rooms/{room_id}/timeout?player_token={token}",
    )
    assert resp_query.status_code == 403, (
        f"Query-param token should be rejected with 403, "
        f"got {resp_query.status_code}: {resp_query.text}"
    )


@pytest.mark.asyncio
async def test_body_token_works_for_all_endpoints(client):
    """All Body(embed=True) endpoints accept token in JSON body."""
    def new_room():
        rid = s.room_manager.create_room(StoryLineType.HOOP_DREAMS, max_turns=5)
        r = client.post("/api/rooms/join", json={"room_id": rid, "player_name": "Alice"})
        # Join second player for endpoints that need 2+ players
        client.post("/api/rooms/join", json={"room_id": rid, "player_name": "Bob"})
        return rid, r.json()["player_token"]

    # start_game (needs 2+ players)
    rid1, tok1 = new_room()
    resp = client.post(f"/api/rooms/{rid1}/start", json={"player_token": tok1})
    assert resp.status_code == 200, f"start_game: {resp.text}"

    # advance_turn (needs VOTING phase)
    rid2, tok2 = new_room()
    room = s.room_manager.get_room(rid2)
    room.phase = GamePhase.VOTING
    s.room_manager.save_room(room)
    resp = client.post(f"/api/turn/advance/{rid2}", json={"player_token": tok2})
    assert resp.status_code == 200, f"advance_turn: {resp.text}"

    # trigger_input_timeout (needs PLAYER_INPUT phase)
    rid3, tok3 = new_room()
    room = s.room_manager.get_room(rid3)
    room.phase = GamePhase.PLAYER_INPUT
    s.room_manager.save_room(room)
    resp = client.post(f"/api/rooms/{rid3}/timeout", json={"player_token": tok3})
    assert resp.status_code == 200, f"trigger_input_timeout: {resp.text}"

    # trigger_voting_timeout (needs VOTING phase)
    rid4, tok4 = new_room()
    room = s.room_manager.get_room(rid4)
    room.phase = GamePhase.VOTING
    s.room_manager.save_room(room)
    resp = client.post(f"/api/voting/{rid4}/timeout", json={"player_token": tok4})
    assert resp.status_code == 200, f"trigger_voting_timeout: {resp.text}"

    # end_game (host only)
    rid5, tok5 = new_room()
    resp = client.post(f"/api/game/end/{rid5}", json={"player_token": tok5})
    assert resp.status_code == 200, f"end_game: {resp.text}"

    # delete_room (host only) — uses request() since httpx<0.x doesn't support json on delete
    rid6, tok6 = new_room()
    resp = client.request("DELETE", f"/api/rooms/{rid6}", json={"player_token": tok6})
    assert resp.status_code == 200, f"delete_room: {resp.text}"
