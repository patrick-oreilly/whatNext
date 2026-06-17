"""
Tests for GameTurn, TurnResult, and the end-to-end game flow.
"""
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock
from datetime import datetime

from backend.core.models import (
    GameRoom, GamePhase, StoryLineType, LlmOutput, PlayerInput,
    TurnResult, TurnDirective
)
from backend.core.errors import (
    InvalidGamePhaseError, PlayerNotInRoomError
)
from backend.core.storage import InMemoryStorage
from backend.core.config import settings
from backend.game_management.room_manager import RoomManager


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------

@pytest.fixture
def storage():
    return InMemoryStorage()


@pytest.fixture
def room_manager(storage):
    return RoomManager(storage)


@pytest.fixture
def session_manager():
    sm = Mock()
    sm.has_session = Mock(return_value=True)
    sm.close_session = Mock()
    sm.create_session = AsyncMock()
    return sm


@pytest.fixture
def story_generator():
    sg = Mock()
    sg.get_storyline_prompt = Mock(return_value="Opening prompt")
    sg.should_end_story = Mock(return_value=False)
    sg.generate_continuation_prompt = Mock(return_value="Continue the story...")
    sg.generate_final_prompt = Mock(return_value="Final prompt")
    sg.generate_natural_continuation_prompt = Mock(return_value="Natural continuation...")
    return sg


@pytest.fixture
def game_turn(room_manager, session_manager, story_generator):
    from backend.game_management.game_turn import GameTurn
    return GameTurn(room_manager, session_manager, story_generator)


@pytest.fixture
def populated_room(room_manager):
    room_id = room_manager.create_room(StoryLineType.HOOP_DREAMS, max_turns=5)
    room_manager.add_player(room_id, "Alice")
    room_manager.add_player(room_id, "Bob")
    return room_id


# ------------------------------------------------------------------
# RoomManager CRUD tests
# ------------------------------------------------------------------

class TestRoomManagerCRUD:
    def test_create_room(self, room_manager):
        room_id = room_manager.create_room(StoryLineType.HOOP_DREAMS, max_turns=5)
        assert len(room_id) == 6
        room = room_manager.get_room(room_id)
        assert room.storyline == StoryLineType.HOOP_DREAMS
        assert room.max_turns == 5
        assert room.phase == GamePhase.LOBBY

    def test_add_player(self, room_manager):
        room_id = room_manager.create_room(StoryLineType.HOOP_DREAMS)
        room_manager.add_player(room_id, "Alice")
        room_manager.add_player(room_id, "Bob")
        room = room_manager.get_room(room_id)
        assert room.players == ["Alice", "Bob"]
        assert room.scores == {"Alice": 0, "Bob": 0}

    def test_remove_player(self, room_manager):
        room_id = room_manager.create_room(StoryLineType.HOOP_DREAMS)
        room_manager.add_player(room_id, "Alice")
        room_manager.add_player(room_id, "Bob")
        room_manager.remove_player(room_id, "Alice")
        room = room_manager.get_room(room_id)
        assert room.players == ["Bob"]
        assert "Alice" not in room.scores

    def test_save_room(self, room_manager):
        room_id = room_manager.create_room(StoryLineType.HOOP_DREAMS)
        room = room_manager.get_room(room_id)
        room.turn = 5
        room_manager.save_room(room)
        reloaded = room_manager.get_room(room_id)
        assert reloaded.turn == 5

    def test_delete_room(self, room_manager):
        room_id = room_manager.create_room(StoryLineType.HOOP_DREAMS)
        room_manager.delete_room(room_id)
        with pytest.raises(Exception):
            room_manager.get_room(room_id)

    def test_list_rooms(self, room_manager):
        r1 = room_manager.create_room(StoryLineType.HOOP_DREAMS)
        r2 = room_manager.create_room(StoryLineType.SPACE_EXPLORATION)
        rooms = room_manager.list_rooms()
        assert r1 in rooms
        assert r2 in rooms
        assert len(rooms) >= 2

    def test_cleanup_idle_rooms(self, room_manager):
        room_id = room_manager.create_room(StoryLineType.HOOP_DREAMS)
        room = room_manager.get_room(room_id)
        room.last_activity = datetime(2020, 1, 1)
        room_manager.save_room(room)
        deleted = room_manager.cleanup_idle_rooms()
        assert len(deleted) >= 1
        with pytest.raises(Exception):
            room_manager.get_room(room_id)

    @pytest.mark.asyncio
    async def test_room_locks_cleaned_up_on_delete(self, room_manager):
        """_room_locks entry is removed when a room is deleted."""
        room_id = room_manager.create_room(StoryLineType.HOOP_DREAMS)
        await room_manager.get_room_lock(room_id)
        assert room_id in room_manager._room_locks
        room_manager.delete_room(room_id)
        assert room_id not in room_manager._room_locks

    @pytest.mark.asyncio
    async def test_room_locks_does_not_grow_unbounded(self, room_manager):
        """Creating and deleting N rooms leaves _room_locks empty."""
        for _ in range(20):
            room_id = room_manager.create_room(StoryLineType.HOOP_DREAMS)
            await room_manager.get_room_lock(room_id)
            room_manager.delete_room(room_id)
        assert len(room_manager._room_locks) == 0

    def test_no_game_logic_methods(self, room_manager):
        forbidden = [
            "start_game", "advance_turn", "set_phase",
            "handle_input_timeout", "submit_player_input", "submit_input",
            "record_vote", "cast_vote", "calculate_winner", "get_winning_input"
        ]
        for method in forbidden:
            assert not hasattr(room_manager, method) or not callable(getattr(room_manager, method, None)), \
                f"RoomManager should not have game-logic method: {method}"


# ------------------------------------------------------------------
# GameTurn: end_game tests
# ------------------------------------------------------------------

class TestEndGame:
    def test_end_game_marks_room_as_game_over(self, game_turn, room_manager, populated_room):
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.GENERATING_STORY
        room.story_has_ended = True
        room_manager.save_room(room)

        result = game_turn.end_game(populated_room)

        assert result.success is True
        assert result.phase == GamePhase.GAME_OVER
        updated = room_manager.get_room(populated_room)
        assert updated.phase == GamePhase.GAME_OVER

    def test_end_game_returns_dispose_session_when_session_active(self, game_turn, room_manager, populated_room, session_manager):
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.GENERATING_STORY
        room.story_has_ended = True
        room_manager.save_room(room)

        session_manager.has_session.return_value = True
        result = game_turn.end_game(populated_room)

        assert result.directive == TurnDirective.DISPOSE_SESSION

    def test_end_game_returns_none_when_no_session(self, game_turn, room_manager, populated_room, session_manager):
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.GENERATING_STORY
        room.story_has_ended = True
        room_manager.save_room(room)

        session_manager.has_session.return_value = False
        result = game_turn.end_game(populated_room)

        assert result.directive == TurnDirective.NONE

    def test_end_game_returns_final_scores(self, game_turn, room_manager, populated_room):
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.GENERATING_STORY
        room.story_has_ended = True
        room.scores = {"Alice": 45, "Bob": 30}
        room_manager.save_room(room)

        result = game_turn.end_game(populated_room)

        assert result.response["final_scores"] == {"Alice": 45, "Bob": 30}
        assert result.response["status"] == "game_ended"


# ------------------------------------------------------------------
# GameTurn: start_game tests
# ------------------------------------------------------------------

class TestStartGame:
    def test_start_game_sets_correct_phase(self, game_turn, room_manager, populated_room):
        result = game_turn.start_game(populated_room)

        assert result.success is True
        assert result.phase == GamePhase.GENERATING_STORY
        assert result.directive == TurnDirective.CREATE_SESSION

        room = room_manager.get_room(populated_room)
        assert room.phase == GamePhase.GENERATING_STORY
        assert room.turn == 1
        assert room.next_prompt is not None

    def test_start_game_not_enough_players(self, game_turn, room_manager):
        room_id = room_manager.create_room(StoryLineType.HOOP_DREAMS)
        room_manager.add_player(room_id, "Solo")

        with pytest.raises(Exception):
            game_turn.start_game(room_id)


# ------------------------------------------------------------------
# GameTurn: submit_input + cast_vote
# ------------------------------------------------------------------

class TestSubmitAndVote:
    def test_submit_input_and_auto_advance(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.PLAYER_INPUT
        room_manager.save_room(room)

        result = game_turn.submit_input(populated_room, "Alice", "Shoot the three!")
        assert result.response["status"] == "submitted"
        assert result.response["submissions"] == 1

        result2 = game_turn.submit_input(populated_room, "Bob", "Pass it inside!")
        assert result2.response["submissions"] == 2
        assert result2.phase == GamePhase.VOTING

    def test_submit_input_invalid_phase(self, game_turn, populated_room):
        """submit_input raises InvalidGamePhaseError when not in PLAYER_INPUT."""
        game_turn.start_game(populated_room)
        with pytest.raises(InvalidGamePhaseError):
            game_turn.submit_input(populated_room, "Alice", "Can't submit yet!")

    def test_submit_input_player_not_in_room(self, game_turn, room_manager, populated_room):
        """submit_input raises PlayerNotInRoomError for unknown players."""
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.PLAYER_INPUT
        room_manager.save_room(room)
        with pytest.raises(PlayerNotInRoomError):
            game_turn.submit_input(populated_room, "Stranger", "Intruder!")

    def test_cast_vote(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.PLAYER_INPUT
        room_manager.save_room(room)

        game_turn.submit_input(populated_room, "Alice", "Shoot the three!")
        game_turn.submit_input(populated_room, "Bob", "Pass it inside!")

        result = game_turn.cast_vote(populated_room, "Alice", "Bob")
        assert result.response["status"] == "voted"

    def test_cast_vote_outside_voting_phase_raises(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.PLAYER_INPUT
        room_manager.save_room(room)

        game_turn.submit_input(populated_room, "Alice", "Shoot the three!")
        game_turn.submit_input(populated_room, "Bob", "Pass it inside!")

        room.phase = GamePhase.GENERATING_STORY
        room_manager.save_room(room)

        with pytest.raises(InvalidGamePhaseError):
            game_turn.cast_vote(populated_room, "Alice", "Bob")


# ------------------------------------------------------------------
# GameTurn: LLM parsing
# ------------------------------------------------------------------

class TestLlmParsing:
    def test_parse_valid_json(self):
        raw = '{"paragraph": "You score!", "status": "Great", "decision": "Go?", "has_story_ended": false, "ending_summary": null}'
        from backend.game_management.game_turn import GameTurn
        result = GameTurn.parse_llm_response(raw)
        assert isinstance(result, LlmOutput)
        assert result.paragraph == "You score!"
        assert result.has_story_ended is False

    def test_parse_story_ended(self):
        raw = '{"paragraph": "The buzzer sounds.", "status": null, "decision": null, "has_story_ended": true, "ending_summary": "Championship won."}'
        from backend.game_management.game_turn import GameTurn
        result = GameTurn.parse_llm_response(raw)
        assert result.has_story_ended is True
        assert result.ending_summary == "Championship won."

    def test_parse_fallback(self):
        raw = "Just some raw text, no JSON here."
        from backend.game_management.game_turn import GameTurn
        result = GameTurn.parse_llm_response(raw)
        assert result.has_story_ended is False
        assert result.paragraph == raw


# ------------------------------------------------------------------
# GameTurn: process_llm_result
# ------------------------------------------------------------------

class TestProcessLlmResult:
    def test_process_llm_result_story_ended(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.GENERATING_STORY
        room_manager.save_room(room)

        raw_text = '{"paragraph": "The final buzzer sounds.", "status": null, "decision": null, "has_story_ended": true, "ending_summary": "You won it all."}'

        result = game_turn.process_llm_result(populated_room, raw_text)
        assert result.response["has_story_ended"] is True
        assert result.directive == TurnDirective.DISPOSE_SESSION

        room = room_manager.get_room(populated_room)
        assert room.story_has_ended is True
        assert len(room.story_history) == 1

    def test_process_llm_result_story_continues(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.GENERATING_STORY
        room_manager.save_room(room)

        raw_text = '{"paragraph": "You drive to the basket.", "status": "Momentum", "decision": "Shoot or pass?", "has_story_ended": false}'

        result = game_turn.process_llm_result(populated_room, raw_text)
        assert result.phase == GamePhase.PLAYER_INPUT

        room = room_manager.get_room(populated_room)
        assert room.phase == GamePhase.PLAYER_INPUT
        assert room.next_prompt is None


# ------------------------------------------------------------------
# GameTurn: advance_turn
# ------------------------------------------------------------------

class TestAdvanceTurn:
    def test_advance_turn_basic(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.VOTING
        room.player_inputs = [
            PlayerInput(player_name="Alice", text="Input A", votes=2),
            PlayerInput(player_name="Bob", text="Input B", votes=1),
        ]
        room_manager.save_room(room)

        result = game_turn.advance_turn(populated_room)
        assert result.response["status"] == "turn_advanced"
        assert result.phase == GamePhase.GENERATING_STORY

        room = room_manager.get_room(populated_room)
        assert room.turn == 2

    def test_advance_turn_idempotent_guard(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.GENERATING_STORY
        room_manager.save_room(room)

        result = game_turn.advance_turn(populated_room)
        assert result.response["status"] == "noop_already_advanced"

    def test_advance_turn_story_has_ended(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.VOTING
        room.story_has_ended = True
        room_manager.save_room(room)

        result = game_turn.advance_turn(populated_room)
        assert result.response["status"] == "game_over"
        assert result.directive == TurnDirective.DISPOSE_SESSION
        assert result.phase == GamePhase.GAME_OVER

    def test_advance_turn_game_over_by_turns(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.VOTING
        room.turn = 5  # max_turns is 5
        room.player_inputs = [
            PlayerInput(player_name="Alice", text="Final input", votes=1),
        ]
        room_manager.save_room(room)

        result = game_turn.advance_turn(populated_room)
        assert result.response["status"] == "game_over"
        assert result.directive == TurnDirective.DISPOSE_SESSION


# ------------------------------------------------------------------
# GameTurn: timeout flows
# ------------------------------------------------------------------

class TestTimeoutFlows:
    def test_handle_input_timeout_multiple(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.PLAYER_INPUT
        room.input_phase_start_time = datetime(2020, 1, 1)
        room.player_inputs = [
            PlayerInput(player_name="Alice", text="A", votes=0),
            PlayerInput(player_name="Bob", text="B", votes=0),
        ]
        room_manager.save_room(room)

        result = game_turn.handle_input_timeout(populated_room)
        assert result.phase == GamePhase.VOTING

    def test_handle_input_timeout_single(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.PLAYER_INPUT
        room.input_phase_start_time = datetime(2020, 1, 1)
        room.player_inputs = [
            PlayerInput(player_name="Alice", text="A", votes=0),
        ]
        room_manager.save_room(room)

        result = game_turn.handle_input_timeout(populated_room)
        updated = room_manager.get_room(populated_room)
        assert updated.turn == 2

    def test_handle_input_timeout_none(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.PLAYER_INPUT
        room.input_phase_start_time = datetime(2020, 1, 1)
        room_manager.save_room(room)

        result = game_turn.handle_input_timeout(populated_room)
        updated = room_manager.get_room(populated_room)
        assert updated.turn == 2
        assert updated.phase == GamePhase.GENERATING_STORY

    def test_handle_input_timeout_premature_is_noop(self, game_turn, room_manager, populated_room):
        """A timeout call before the server clock has elapsed must not advance
        the phase or time anyone out (prevents the instant phase-skip exploit)."""
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.PLAYER_INPUT
        room.input_phase_start_time = datetime.now()  # just started
        room.player_inputs = [PlayerInput(player_name="Alice", text="A", votes=0)]
        room_manager.save_room(room)

        result = game_turn.handle_input_timeout(populated_room)

        updated = room_manager.get_room(populated_room)
        assert result.response["status"] == "not_timed_out"
        assert updated.phase == GamePhase.PLAYER_INPUT
        assert updated.timed_out_players == []
        assert updated.turn == 1


# ------------------------------------------------------------------
# GameTurn: voting
# ------------------------------------------------------------------

class TestVoting:
    @pytest.mark.asyncio
    async def test_get_voting_results(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.VOTING
        room.player_inputs = [
            PlayerInput(player_name="Alice", text="A", votes=2, voters=["Bob"]),
            PlayerInput(player_name="Bob", text="B", votes=0, voters=[]),
        ]
        room_manager.save_room(room)

        result = await game_turn.get_voting_results(populated_room)
        assert result.success is True
        assert "winning_player" in result.response
        assert "vote_counts" in result.response

    @pytest.mark.asyncio
    async def test_resolve_voting(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.VOTING
        room.player_inputs = [
            PlayerInput(player_name="Alice", text="A", votes=2, voters=["Bob"]),
            PlayerInput(player_name="Bob", text="B", votes=0, voters=[]),
        ]
        room_manager.save_room(room)

        result = await game_turn.resolve_voting(populated_room)
        assert result.success is True
        assert "winning_player" in result.response
        assert "vote_counts" in result.response

    @pytest.mark.asyncio
    async def test_tie_breaking_produces_winner(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.VOTING
        room.turn = 1
        room.player_inputs = [
            PlayerInput(player_name="Alice", text="A", votes=1, voters=["Alice"]),
            PlayerInput(player_name="Bob", text="B", votes=1, voters=["Bob"]),
        ]
        room_manager.save_room(room)

        import random as test_random
        test_random.seed(42)
        import backend.game_management.game_turn as gt_module
        gt_module.random.seed(42)

        result = await game_turn.resolve_voting(populated_room)
        assert result.success is True
        assert result.response["was_tie"] is True
        assert result.response["winning_player"] in ["Alice", "Bob"]
        assert len(result.response["tied_players"]) == 2

    @pytest.mark.asyncio
    async def test_tie_winner_is_stable_across_calls(self, game_turn, room_manager, populated_room, monkeypatch):
        """A tie must resolve to the same winner on every call/turn so that all
        polling clients see one consistent result (C2)."""
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.VOTING
        room.turn = 1
        room.player_inputs = [
            PlayerInput(player_name="Alice", text="A", votes=1, voters=["Bob"]),
            PlayerInput(player_name="Bob", text="B", votes=1, voters=["Alice"]),
        ]
        room_manager.save_room(room)

        # Simulate two clients getting divergent RNG: first pick the head of the
        # tied list, then the tail. A correct implementation resolves once and
        # reuses the winner, so random.choice is consulted at most once.
        import backend.game_management.game_turn as gt_module
        state = {"n": 0}

        def diverging_choice(seq):
            idx = 0 if state["n"] == 0 else len(seq) - 1
            state["n"] += 1
            return seq[idx]

        monkeypatch.setattr(gt_module.random, "choice", diverging_choice)

        r1 = await game_turn.resolve_voting(populated_room)
        r2 = await game_turn.resolve_voting(populated_room)

        assert r1.response["winning_player"] == r2.response["winning_player"]
        assert state["n"] == 1, "winner should be resolved once and reused"

    @pytest.mark.asyncio
    async def test_handle_voting_timeout(self, game_turn, room_manager, populated_room):
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.VOTING
        room.voting_phase_start_time = datetime(2020, 1, 1)
        room.player_inputs = [
            PlayerInput(player_name="Alice", text="A", votes=2, voters=["Bob"]),
            PlayerInput(player_name="Bob", text="B", votes=0, voters=[]),
        ]
        room_manager.save_room(room)

        result = await game_turn.handle_voting_timeout(populated_room)
        assert result.response["status"] == "timeout_handled"
        assert "winner" in result.response

    @pytest.mark.asyncio
    async def test_handle_voting_timeout_premature_is_noop(self, game_turn, room_manager, populated_room):
        """A voting timeout call before the server clock has elapsed must not
        resolve voting or change the phase."""
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.VOTING
        room.voting_phase_start_time = datetime.now()  # just started
        room.player_inputs = [
            PlayerInput(player_name="Alice", text="A", votes=1, voters=["Bob"]),
            PlayerInput(player_name="Bob", text="B", votes=0, voters=[]),
        ]
        room_manager.save_room(room)

        result = await game_turn.handle_voting_timeout(populated_room)

        updated = room_manager.get_room(populated_room)
        assert result.response["status"] == "not_timed_out"
        assert updated.phase == GamePhase.VOTING


# ------------------------------------------------------------------
# Full turn loop end-to-end (in-process)
# ------------------------------------------------------------------

class TestFullTurnLoop:
    def test_full_turn_loop(self, game_turn, room_manager, session_manager, story_generator, populated_room):
        """
        End-to-end: create room -> start -> submit input -> vote -> advance ->
        (repeat) -> story ends via LLM -> game over
        """
        # Start game
        result = game_turn.start_game(populated_room)
        assert result.directive == TurnDirective.CREATE_SESSION

        room = room_manager.get_room(populated_room)
        assert room.phase == GamePhase.GENERATING_STORY
        assert room.turn == 1

        # Simulate LLM streaming completion (turn 1 - opening)
        raw_text_1 = '{"paragraph": "The game begins! You step onto the court.", "status": "Opening tip", "decision": "Offense or defense?", "has_story_ended": false}'
        result = game_turn.process_llm_result(populated_room, raw_text_1)
        assert result.phase == GamePhase.PLAYER_INPUT
        room = room_manager.get_room(populated_room)
        assert room.phase == GamePhase.PLAYER_INPUT
        assert room.turn == 1

        # Turn 1: players submit inputs
        game_turn.submit_input(populated_room, "Alice", "Run the pick and roll!")
        game_turn.submit_input(populated_room, "Bob", "Isolate and drive!")
        room = room_manager.get_room(populated_room)
        assert room.phase == GamePhase.VOTING

        # Vote
        game_turn.cast_vote(populated_room, "Alice", "Bob")
        game_turn.cast_vote(populated_room, "Bob", "Alice")

        # Advance turn 1 -> 2
        result = game_turn.advance_turn(populated_room)
        assert result.response["status"] == "turn_advanced"
        room = room_manager.get_room(populated_room)
        assert room.turn == 2
        assert room.phase == GamePhase.GENERATING_STORY

        # Simulate LLM for turn 2
        raw_text_2 = '{"paragraph": "Alice drives and kicks to Bob for the open shot!", "status": "Great teamwork", "decision": "Keep pushing?", "has_story_ended": false}'
        result = game_turn.process_llm_result(populated_room, raw_text_2)
        assert result.phase == GamePhase.PLAYER_INPUT
        room = room_manager.get_room(populated_room)
        assert room.turn == 2

        # Turn 2: one player submits, other times out (force the clock past the limit)
        game_turn.submit_input(populated_room, "Alice", "Full court press!")
        room = room_manager.get_room(populated_room)
        room.input_phase_start_time = datetime(2020, 1, 1)
        room_manager.save_room(room)
        result = game_turn.handle_input_timeout(populated_room)

        # Turn 3: simulate LLM ending the story
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.GENERATING_STORY
        room_manager.save_room(room)

        llm_output_final = '{"paragraph": "The final buzzer sounds! Championship won!", "status": null, "decision": null, "has_story_ended": true, "ending_summary": "An incredible season ends in glory."}'
        result = game_turn.process_llm_result(populated_room, llm_output_final)
        assert result.response["has_story_ended"] is True
        room = room_manager.get_room(populated_room)
        assert room.story_has_ended is True

        # End game
        result = game_turn.end_game(populated_room)
        assert result.phase == GamePhase.GAME_OVER
        assert result.directive == TurnDirective.DISPOSE_SESSION

        room = room_manager.get_room(populated_room)
        assert room.phase == GamePhase.GAME_OVER

    def test_story_ends_flow_dispose_session(self, game_turn, room_manager, session_manager, populated_room):
        """Verify: story ends -> has_story_ended=true -> DisposeSession -> Game Over"""
        game_turn.start_game(populated_room)
        room = room_manager.get_room(populated_room)
        room.phase = GamePhase.GENERATING_STORY
        room_manager.save_room(room)

        llm_output = '{"paragraph": "The story concludes.", "status": null, "decision": null, "has_story_ended": true, "ending_summary": "All done."}'
        result = game_turn.process_llm_result(populated_room, llm_output)
        assert result.response["has_story_ended"] is True

        room = room_manager.get_room(populated_room)
        assert room.story_has_ended is True

        result = game_turn.end_game(populated_room)
        assert result.directive == TurnDirective.DISPOSE_SESSION
        assert result.phase == GamePhase.GAME_OVER
