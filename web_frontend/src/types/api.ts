// API request and response types

import { StoryLineType, GamePhase } from './game';
import type { PlayerInput, StorySegment } from './game';

// Request types
export interface CreateRoomRequest {
  storyline: StoryLineType;
  max_turns: number;
}

export interface JoinRoomRequest {
  room_id: string;
  player_name: string;
}

export interface SubmitInputRequest {
  room_id: string;
  player_name: string;
  input_text: string;
  player_token?: string;
}

export interface CastVoteRequest {
  room_id: string;
  voter: string;
  chosen_player: string;
  player_token?: string;
}

// Response types
export interface CreateRoomResponse {
  room_id: string;
  storyline: string;
  status: string;
}

export interface JoinRoomResponse {
  room_id: string;
  players: string[];
  status: string;
  player_token: string;
}

export interface RoomStateResponse {
  room_id: string;
  storyline: StoryLineType;
  players: string[];
  scores: Record<string, number>;
  turn: number;
  phase: GamePhase;
  story_history: StorySegment[];
  player_inputs: PlayerInput[];
  max_turns: number;
  input_phase_start_time?: string | null;
  voting_phase_start_time?: string | null;  // NEW: For voting timer
  voting_timeout_seconds?: number;
  input_timeout_seconds?: number;
  timed_out_players?: string[];
  story_has_ended?: boolean;
}

export interface VotingResultsResponse {
  room_id: string;
  winning_player: string;
  winning_input: string;
  vote_counts: Record<string, number>;
  was_tie?: boolean;  // NEW: Was there a tie?
  tied_players?: string[];  // NEW: Which players tied?
}

export interface HealthResponse {
  status: string;
  api_configured: boolean;
  active_rooms: number;
  timestamp: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: string;
}

export interface SubmitInputResponse {
  status: string;
  submissions: number;
  total_players: number;
  phase: GamePhase;
}

export interface StartGameResponse {
  status: string;
  room_id: string;
  turn: number;
  phase: GamePhase;
}

export interface AdvanceTurnResponse {
  status: string;
  turn: number;
  phase: GamePhase;
  final_scores?: Record<string, number>;
}
