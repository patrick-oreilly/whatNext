// Form validation utilities

import {
  MIN_INPUT_LENGTH,
  MAX_INPUT_LENGTH,
  MIN_PLAYER_NAME_LENGTH,
  MAX_PLAYER_NAME_LENGTH,
  ROOM_CODE_LENGTH,
  MIN_TURNS,
  MAX_TURNS,
} from './constants';

export const validatePlayerName = (name: string): string | null => {
  if (!name || name.trim().length < MIN_PLAYER_NAME_LENGTH) {
    return 'Player name is required';
  }
  if (name.length > MAX_PLAYER_NAME_LENGTH) {
    return `Player name must be ${MAX_PLAYER_NAME_LENGTH} characters or less`;
  }
  return null;
};

export const validateRoomCode = (code: string): string | null => {
  if (!code || code.trim().length === 0) {
    return 'Room code is required';
  }
  if (code.length !== ROOM_CODE_LENGTH) {
    return `Room code must be exactly ${ROOM_CODE_LENGTH} characters`;
  }
  return null;
};

export const validatePlayerInput = (text: string): string | null => {
  if (!text || text.trim().length < MIN_INPUT_LENGTH) {
    return `Input must be at least ${MIN_INPUT_LENGTH} characters`;
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return `Input must be ${MAX_INPUT_LENGTH} characters or less`;
  }
  return null;
};

export const validateMaxTurns = (turns: number): string | null => {
  if (turns < MIN_TURNS || turns > MAX_TURNS) {
    return `Max turns must be between ${MIN_TURNS} and ${MAX_TURNS}`;
  }
  return null;
};
