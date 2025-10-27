// Application constants

export const APP_NAME = 'What\'s Next';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Game settings
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const MIN_TURNS = 5;
export const MAX_TURNS = 20;
export const DEFAULT_TURNS = 10;

// Input validation
export const MIN_INPUT_LENGTH = 10;
export const MAX_INPUT_LENGTH = 500;
export const MIN_PLAYER_NAME_LENGTH = 1;
export const MAX_PLAYER_NAME_LENGTH = 20;
export const ROOM_CODE_LENGTH = 6;

// Polling intervals (in milliseconds)
export const LOBBY_POLL_INTERVAL = 2000;
export const GAME_STATE_POLL_INTERVAL = 3000;

// LocalStorage keys
export const STORAGE_KEYS = {
  PLAYER_NAME: 'whats_next_player_name',
  ROOM_ID: 'whats_next_room_id',
} as const;

// Phase labels
export const PHASE_LABELS = {
  lobby: 'Waiting for players...',
  generating_story: 'AI is creating the story...',
  player_input: 'Time to write!',
  voting: 'Vote for your favorite!',
  game_over: 'Game Over',
} as const;
