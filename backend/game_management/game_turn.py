import logging
import json
import random
import re
import asyncio
from typing import Dict
from datetime import datetime

from backend.core.models import (
    GameRoom, GamePhase, StoryLineType, PlayerInput,
    StorySegment, LlmOutput, VotingResultsResponse, TurnResult, TurnDirective
)
from backend.core.errors import (
    RoomNotFoundError, PlayerNotInRoomError,
    InvalidGamePhaseError, NotEnoughPlayersError,
    VotingError
)
from backend.core.config import settings

logger = logging.getLogger(__name__)


class GameTurn:
    """Orchestrates game turn logic: phases, timing, scoring, prompts, and LLM result processing."""

    def __init__(self, room_manager, session_manager, story_generator):
        self.room_manager = room_manager
        self.session_manager = session_manager
        self.story_generator = story_generator

    def _get_room(self, room_id: str) -> GameRoom:
        return self.room_manager.get_room(room_id)

    def _save_room(self, room: GameRoom) -> None:
        self.room_manager.save_room(room)

    # ------------------------------------------------------------------
    # LLM output parsing
    # ------------------------------------------------------------------

    @staticmethod
    def parse_llm_response(raw_response: str) -> LlmOutput:
        """Extract and parse a structured LlmOutput from an ADK text response."""
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        matches = re.findall(json_pattern, raw_response, re.DOTALL)

        if matches:
            first_json = matches[0]
            try:
                story_data = json.loads(first_json)
                llm_output = LlmOutput(**story_data)
                logger.info(f"Parsed structured output: has_story_ended={llm_output.has_story_ended}")
                return llm_output
            except (json.JSONDecodeError, Exception) as e:
                logger.error(f"Failed to parse JSON object: {e}")

        logger.error(f"Could not parse LLM response, falling back to raw text")
        return LlmOutput(
            paragraph=raw_response,
            status="Error parsing response",
            decision="Continue?",
            has_story_ended=False
        )

    # ------------------------------------------------------------------
    # Phase validation helpers
    # ------------------------------------------------------------------

    def _validate_phase(self, room: GameRoom, expected: GamePhase, action: str) -> None:
        if room.phase != expected:
            raise InvalidGamePhaseError(
                f"Cannot {action} - current phase is {room.phase}",
                details=f"{action} only allowed during {expected} phase"
            )

    # ------------------------------------------------------------------
    # start_game
    # ------------------------------------------------------------------

    def start_game(self, room_id: str) -> TurnResult:
        room = self._get_room(room_id)
        self._validate_phase(room, GamePhase.LOBBY, "start game")

        if not room.can_start(settings.MIN_PLAYERS):
            raise NotEnoughPlayersError(
                f"Need at least {settings.MIN_PLAYERS} players to start",
                details=f"Current players: {len(room.players)}"
            )

        room.phase = GamePhase.GENERATING_STORY
        room.turn = 1
        room.update_activity()
        self._save_room(room)

        initial_message = self.story_generator.get_storyline_prompt(room.storyline)
        room.next_prompt = initial_message
        self._save_room(room)

        logger.info(f"Game started in room {room_id} with {len(room.players)} players")

        return TurnResult(
            success=True,
            directive=TurnDirective.CREATE_SESSION,
            response={
                "status": "started",
                "room_id": room_id,
                "turn": 1,
                "phase": GamePhase.GENERATING_STORY,
                "prompt": initial_message
            },
            phase=GamePhase.GENERATING_STORY
        )

    # ------------------------------------------------------------------
    # submit_input
    # ------------------------------------------------------------------

    def submit_input(self, room_id: str, player_name: str, input_text: str) -> TurnResult:
        room = self._get_room(room_id)
        self._validate_phase(room, GamePhase.PLAYER_INPUT, "submit input")

        if player_name not in room.players:
            raise PlayerNotInRoomError(f"Player '{player_name}' not in room {room_id}")

        existing = next(
            (inp for inp in room.player_inputs if inp.player_name == player_name),
            None
        )

        if existing:
            existing.text = input_text
            logger.info(f"Player '{player_name}' updated input in room {room_id}")
        else:
            room.player_inputs.append(PlayerInput(
                player_name=player_name,
                text=input_text,
                votes=0
            ))
            logger.info(f"Player '{player_name}' submitted NEW input in room {room_id}")

        active_players = [p for p in room.players if p not in room.timed_out_players]
        if len(room.player_inputs) == len(active_players):
            room.phase = GamePhase.VOTING
            room.voting_phase_start_time = datetime.now()
            logger.info(f"All players submitted in room {room_id} - advancing to VOTING")

        room.update_activity()
        self._save_room(room)

        return TurnResult(
            success=True,
            response={
                "status": "submitted",
                "submissions": len(room.player_inputs),
                "total_players": len(room.players),
                "phase": room.phase
            },
            phase=room.phase
        )

    # ------------------------------------------------------------------
    # cast_vote
    # ------------------------------------------------------------------

    def cast_vote(self, room_id: str, voter: str, chosen_player: str) -> TurnResult:
        room = self._get_room(room_id)
        self._validate_phase(room, GamePhase.VOTING, "vote")

        if voter not in room.players:
            raise PlayerNotInRoomError(f"Voter '{voter}' not in room {room_id}")

        if voter in room.timed_out_players:
            raise VotingError("Cannot vote - you did not submit an input during the input phase")

        if voter == chosen_player:
            raise VotingError("Cannot vote for your own input")

        chosen_input = next(
            (inp for inp in room.player_inputs if inp.player_name == chosen_player),
            None
        )
        if not chosen_input:
            raise VotingError(f"Player '{chosen_player}' has no input to vote for")

        for inp in room.player_inputs:
            if hasattr(inp, 'voters') and voter in inp.voters:
                inp.voters.remove(voter)
                inp.votes -= 1

        if not hasattr(chosen_input, 'voters'):
            chosen_input.voters = []
        chosen_input.voters.append(voter)
        chosen_input.votes += 1

        room.update_activity()
        self._save_room(room)

        logger.info(f"Player '{voter}' voted for '{chosen_player}' in room {room_id}")

        return TurnResult(
            success=True,
            response={"status": "voted"},
            phase=room.phase
        )

    # ------------------------------------------------------------------
    # resolve_voting / voting results
    # ------------------------------------------------------------------

    def _resolve_voting_locked(self, room: GameRoom, room_id: str) -> TurnResult:
        if not room.player_inputs:
            raise VotingError("No player inputs to vote on")

        max_votes = max(inp.votes for inp in room.player_inputs)
        tied_inputs = [inp for inp in room.player_inputs if inp.votes == max_votes]
        was_tie = len(tied_inputs) > 1
        tied_player_names = [inp.player_name for inp in tied_inputs]

        # Resolve the (possibly random) winner once per turn and reuse it, so
        # every polling client and the subsequent advance_turn agree on the
        # same winner instead of re-rolling on each call.
        already_resolved = next(
            (inp for inp in tied_inputs if inp.player_name == room.winning_player),
            None
        ) if room.winner_resolved_turn == room.turn else None

        if already_resolved is not None:
            winning_input = already_resolved
        else:
            winning_input = random.choice(tied_inputs)
            room.winning_player = winning_input.player_name
            room.winner_resolved_turn = room.turn

        vote_counts = {inp.player_name: inp.votes for inp in room.player_inputs}

        if room.points_awarded_turn is None or room.points_awarded_turn != room.turn:
            for inp in room.player_inputs:
                points_earned = inp.votes * 15
                if inp.player_name not in room.scores:
                    room.scores[inp.player_name] = 0
                room.scores[inp.player_name] += points_earned
            room.points_awarded_turn = room.turn

        room.update_activity()
        self._save_room(room)

        results = VotingResultsResponse(
            room_id=room_id,
            winning_player=winning_input.player_name,
            winning_input=winning_input.text,
            vote_counts=vote_counts,
            was_tie=was_tie,
            tied_players=tied_player_names
        )

        logger.info(f"Voting winner in room {room_id}: '{winning_input.player_name}' with {winning_input.votes} votes")

        return TurnResult(
            success=True,
            response=results.model_dump(),
            phase=room.phase
        )

    async def resolve_voting(self, room_id: str) -> TurnResult:
        lock = await self.room_manager.get_room_lock(room_id)
        async with lock:
            room = self._get_room(room_id)
            return self._resolve_voting_locked(room, room_id)

    async def get_voting_results(self, room_id: str) -> TurnResult:
        return await self.resolve_voting(room_id)

    # ------------------------------------------------------------------
    # handle_input_timeout
    # ------------------------------------------------------------------

    def handle_input_timeout(self, room_id: str) -> TurnResult:
        room = self._get_room(room_id)
        self._validate_phase(room, GamePhase.PLAYER_INPUT, "handle input timeout")

        if not room.is_input_phase_timed_out(settings.INPUT_TIMER_SECONDS):
            logger.info(
                f"Input timeout called for room {room_id} before the clock elapsed; ignoring"
            )
            return TurnResult(
                success=True,
                response={"status": "not_timed_out", "room_id": room_id, "phase": room.phase},
                phase=room.phase,
            )

        submitted_players = [inp.player_name for inp in room.player_inputs]
        for player in room.players:
            if player not in submitted_players and player not in room.timed_out_players:
                room.timed_out_players.append(player)
                logger.info(f"Player '{player}' timed out (no submission)")

        logger.info(f"Timeout summary: {len(submitted_players)} submitted, {len(room.timed_out_players)} timed out")

        if len(room.player_inputs) > 1:
            room.phase = GamePhase.VOTING
            room.voting_phase_start_time = datetime.now()
            room.update_activity()
            self._save_room(room)
            logger.info(f"Advanced to voting with {len(room.player_inputs)} inputs")
            return TurnResult(
                success=True,
                response={"status": "timeout_handled", "room_id": room_id, "phase": room.phase},
                phase=room.phase
            )

        elif len(room.player_inputs) == 1:
            single_input = room.player_inputs[0]
            if room.points_awarded_turn != room.turn:
                room.scores[single_input.player_name] = room.scores.get(single_input.player_name, 0) + 15
                room.points_awarded_turn = room.turn
            single_input.votes = 1
            single_input.voters = []

            if self.story_generator:
                if self.story_generator.should_end_story(room.turn, room.max_turns):
                    prompt = self.story_generator.generate_final_prompt(
                        storyline=room.storyline,
                        story_history=room.story_history,
                        winning_input=single_input.text
                    )
                else:
                    prompt = self.story_generator.generate_continuation_prompt(
                        storyline=room.storyline,
                        story_history=room.story_history,
                        winning_input=single_input.text,
                        turn=room.turn + 1,
                        max_turns=room.max_turns
                    )
                room.next_prompt = prompt

            room.turn += 1
            room.player_inputs = []
            if room.should_end_game():
                room.phase = GamePhase.GAME_OVER
            else:
                room.phase = GamePhase.GENERATING_STORY
            room.voting_phase_start_time = None

            room.update_activity()
            self._save_room(room)
            logger.info(f"Single input processed: turn advanced to {room.turn}, phase = {room.phase}")
            return TurnResult(
                success=True,
                response={"status": "timeout_handled", "room_id": room_id, "phase": room.phase},
                phase=room.phase
            )

        else:
            room.turn += 1
            room.player_inputs = []
            if room.should_end_game():
                room.phase = GamePhase.GAME_OVER
                room.update_activity()
                self._save_room(room)
                logger.info(f"Game ended in room {room_id} after {room.turn} turns")
                return TurnResult(
                    success=True,
                    response={"status": "timeout_handled", "room_id": room_id, "phase": room.phase},
                    phase=room.phase
                )

            if self.story_generator:
                if self.story_generator.should_end_story(room.turn, room.max_turns):
                    prompt = self.story_generator.generate_natural_continuation_prompt(
                        storyline=room.storyline,
                        story_history=room.story_history,
                        turn=room.turn,
                        max_turns=room.max_turns
                    )
                    prompt += (
                        "\n\nFINAL TURN: This is the last turn. Bring the story to a "
                        "dramatic and satisfying conclusion that wraps up all major plot threads. "
                        "Make it memorable and impactful."
                    )
                else:
                    prompt = self.story_generator.generate_natural_continuation_prompt(
                        storyline=room.storyline,
                        story_history=room.story_history,
                        turn=room.turn,
                        max_turns=room.max_turns
                    )
                room.next_prompt = prompt

            room.phase = GamePhase.GENERATING_STORY
            room.voting_phase_start_time = None
            room.update_activity()
            self._save_room(room)
            logger.info(f"Advanced to turn {room.turn} with natural continuation in room {room_id}")
            return TurnResult(
                success=True,
                response={"status": "timeout_handled", "room_id": room_id, "phase": room.phase},
                phase=room.phase
            )

    # ------------------------------------------------------------------
    # handle_voting_timeout
    # ------------------------------------------------------------------

    async def handle_voting_timeout(self, room_id: str) -> TurnResult:
        lock = await self.room_manager.get_room_lock(room_id)
        async with lock:
            room = self._get_room(room_id)
            self._validate_phase(room, GamePhase.VOTING, "handle voting timeout")

            if not room.is_voting_phase_timed_out(settings.VOTING_TIMER_SECONDS):
                logger.info(
                    f"Voting timeout called for room {room_id} before the clock elapsed; ignoring"
                )
                return TurnResult(
                    success=True,
                    response={"status": "not_timed_out", "room_id": room_id, "phase": room.phase},
                    phase=room.phase,
                )

            result = self._resolve_voting_locked(room, room_id)
            winner = result.response.get("winning_player")
            vote_counts = result.response.get("vote_counts")

            logger.info(f"Voting timeout handled in room {room_id}, winner: {winner}")

            return TurnResult(
                success=True,
                response={
                    "status": "timeout_handled",
                    "room_id": room_id,
                    "winner": winner,
                    "votes_received": vote_counts
                },
                phase=result.phase
            )

    # ------------------------------------------------------------------
    # advance_turn
    # ------------------------------------------------------------------

    def advance_turn(self, room_id: str) -> TurnResult:
        room = self._get_room(room_id)

        if room.phase == GamePhase.GAME_OVER:
            logger.warning(
                f"advance_turn ignored for room {room_id}: game already over"
            )
            return TurnResult(
                success=True,
                response={"status": "noop_game_over", "turn": room.turn, "phase": room.phase},
                phase=room.phase
            )

        if room.phase == GamePhase.GENERATING_STORY:
            logger.warning(
                f"advance_turn ignored for room {room_id}: "
                f"story already generating (phase={room.phase})"
            )
            return TurnResult(
                success=True,
                response={"status": "noop_already_advanced", "turn": room.turn, "phase": room.phase},
                phase=room.phase
            )

        if room.phase != GamePhase.VOTING:
            raise InvalidGamePhaseError(
                f"Cannot advance turn in phase {room.phase}",
                details=f"Room {room_id} is in phase {room.phase}, expected VOTING"
            )

        if room.story_has_ended:
            logger.info(f"Story already ended in room {room_id}, transitioning to GAME_OVER")
            if room.player_inputs:
                self._resolve_voting_locked(room, room_id)
            room.phase = GamePhase.GAME_OVER
            room.update_activity()
            self._save_room(room)
            return TurnResult(
                success=True,
                directive=TurnDirective.DISPOSE_SESSION,
                response={"status": "game_over", "turn": room.turn, "final_scores": room.scores},
                phase=GamePhase.GAME_OVER
            )

        winning_input_text = None
        if room.player_inputs:
            result = self._resolve_voting_locked(room, room_id)
            winning_input_text = result.response.get("winning_input")

        room.turn += 1
        room.player_inputs = []

        if room.should_end_game():
            room.phase = GamePhase.GAME_OVER
            room.voting_phase_start_time = None
            room.update_activity()
            self._save_room(room)
            logger.info(f"Game ended in room {room_id} after {room.turn} turns")
            return TurnResult(
                success=True,
                directive=TurnDirective.DISPOSE_SESSION,
                response={"status": "game_over", "turn": room.turn, "final_scores": room.scores},
                phase=GamePhase.GAME_OVER
            )

        if winning_input_text:
            if self.story_generator.should_end_story(room.turn, room.max_turns):
                prompt = self.story_generator.generate_final_prompt(
                    storyline=room.storyline,
                    story_history=room.story_history,
                    winning_input=winning_input_text
                )
            else:
                prompt = self.story_generator.generate_continuation_prompt(
                    storyline=room.storyline,
                    story_history=room.story_history,
                    winning_input=winning_input_text,
                    turn=room.turn,
                    max_turns=room.max_turns
                )
        else:
            if self.story_generator.should_end_story(room.turn, room.max_turns):
                prompt = self.story_generator.generate_natural_continuation_prompt(
                    storyline=room.storyline,
                    story_history=room.story_history,
                    turn=room.turn,
                    max_turns=room.max_turns
                )
                prompt += (
                    "\n\nFINAL TURN: This is the last turn. Bring the story to a "
                    "dramatic and satisfying conclusion that wraps up all major plot threads. "
                    "Make it memorable and impactful."
                )
            else:
                prompt = self.story_generator.generate_natural_continuation_prompt(
                    storyline=room.storyline,
                    story_history=room.story_history,
                    turn=room.turn,
                    max_turns=room.max_turns
                )

        room.next_prompt = prompt
        room.phase = GamePhase.GENERATING_STORY
        room.voting_phase_start_time = None
        room.update_activity()
        self._save_room(room)

        logger.info(f"Advanced to turn {room.turn} in room {room_id}")

        return TurnResult(
            success=True,
            response={"status": "turn_advanced", "turn": room.turn, "phase": GamePhase.GENERATING_STORY},
            phase=GamePhase.GENERATING_STORY
        )

    # ------------------------------------------------------------------
    # process_llm_result
    # ------------------------------------------------------------------

    def process_llm_result(self, room_id: str, raw_text: str) -> TurnResult:
        room = self._get_room(room_id)
        self._validate_phase(room, GamePhase.GENERATING_STORY, "process LLM result")

        llm_output = self.parse_llm_response(raw_text)

        segment = StorySegment(
            turn=room.turn,
            content=llm_output,
            winning_player=None
        )
        room.story_history.append(segment)
        room.next_prompt = None
        room.update_activity()

        if llm_output.has_story_ended:
            logger.info(f"Story has ended flag set for room {room_id}")
            room.story_has_ended = True
            room.phase = GamePhase.GAME_OVER
            self._save_room(room)
            return TurnResult(
                success=True,
                directive=TurnDirective.DISPOSE_SESSION,
                response={"status": "story_ending", "has_story_ended": True},
                phase=GamePhase.GAME_OVER
            )

        room.phase = GamePhase.PLAYER_INPUT
        room.input_phase_start_time = datetime.now()
        room.timed_out_players = []
        self._save_room(room)

        return TurnResult(
            success=True,
            response={"status": "turn_continued"},
            phase=GamePhase.PLAYER_INPUT
        )

    # ------------------------------------------------------------------
    # end_game
    # ------------------------------------------------------------------

    def end_game(self, room_id: str) -> TurnResult:
        room = self._get_room(room_id)

        logger.info(f"Ending game for room {room_id}")

        room.phase = GamePhase.GAME_OVER
        self._save_room(room)

        has_session = self.session_manager.has_session(room_id)

        logger.info(f"Game ended in room {room_id}")

        return TurnResult(
            success=True,
            directive=TurnDirective.DISPOSE_SESSION if has_session else TurnDirective.NONE,
            response={
                "status": "game_ended",
                "room_id": room_id,
                "final_scores": room.scores
            },
            phase=GamePhase.GAME_OVER
        )

    # ------------------------------------------------------------------
    # Room state & timer queries
    # ------------------------------------------------------------------

    def get_room_state(self, room_id: str) -> TurnResult:
        room = self._get_room(room_id)
        return TurnResult(
            success=True,
            response=self.room_manager.get_room_state_response(room_id).model_dump(),
            phase=room.phase
        )

    def get_input_timer(self, room_id: str) -> TurnResult:
        room = self._get_room(room_id)

        if room.phase != GamePhase.PLAYER_INPUT:
            return TurnResult(
                success=True,
                response={"active": False, "message": "Input phase not active"},
                phase=room.phase
            )

        time_remaining = room.get_input_time_remaining(settings.INPUT_TIMER_SECONDS)
        has_timed_out = room.is_input_phase_timed_out(settings.INPUT_TIMER_SECONDS)

        return TurnResult(
            success=True,
            response={
                "active": True,
                "time_remaining": time_remaining,
                "has_timed_out": has_timed_out,
                "timeout_seconds": settings.INPUT_TIMER_SECONDS,
                "submitted_count": len(room.player_inputs),
                "total_players": len(room.players),
                "timed_out_players": room.timed_out_players
            },
            phase=room.phase
        )

    def get_voting_timer(self, room_id: str) -> TurnResult:
        room = self._get_room(room_id)

        if room.phase != GamePhase.VOTING:
            return TurnResult(
                success=True,
                response={"active": False, "message": "Voting phase not active"},
                phase=room.phase
            )

        time_remaining = room.get_voting_time_remaining(settings.VOTING_TIMER_SECONDS)
        has_timed_out = room.is_voting_phase_timed_out(settings.VOTING_TIMER_SECONDS)

        return TurnResult(
            success=True,
            response={
                "active": True,
                "time_remaining": time_remaining,
                "has_timed_out": has_timed_out,
                "timeout_seconds": settings.VOTING_TIMER_SECONDS,
                "total_inputs": len(room.player_inputs),
                "total_players": len(room.players),
                "timed_out_players": room.timed_out_players
            },
            phase=room.phase
        )
