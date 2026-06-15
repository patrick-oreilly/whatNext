// Game state management with Zustand

import { create } from 'zustand';
import type { RoomState } from '../types';

interface GameStore {
  // Room state
  roomState: RoomState | null;
  setRoomState: (state: RoomState) => void;

  // Current player info
  currentPlayer: string | null;
  setCurrentPlayer: (name: string) => void;

  // Per-room auth token issued at join time
  playerToken: string | null;
  setPlayerToken: (token: string | null) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Actions
  reset: () => void;
  updateRoomState: (updates: Partial<RoomState>) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  roomState: null,
  currentPlayer: null,
  playerToken: null,
  isLoading: false,
  error: null,

  // Setters
  setRoomState: (state) => set({ roomState: state }),
  setCurrentPlayer: (name) => set({ currentPlayer: name }),
  setPlayerToken: (token) => set({ playerToken: token }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Actions
  reset: () => set({
    roomState: null,
    currentPlayer: null,
    playerToken: null,
    isLoading: false,
    error: null,
  }),

  updateRoomState: (updates) => set((state) => ({
    roomState: state.roomState ? { ...state.roomState, ...updates } : null,
  })),
}));
