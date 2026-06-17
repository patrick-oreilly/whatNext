// Unified GameApi module — all REST endpoints + SSE factory

import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import type {
  ApiError,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RoomStateResponse,
  StartGameResponse,
  SubmitInputRequest,
  SubmitInputResponse,
  CastVoteRequest,
  VotingResultsResponse,
  AdvanceTurnResponse,
} from '../types';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const apiError = error.response?.data;

    // Format error for display
    const formattedError: ApiError = {
      error: apiError?.error || 'unknown_error',
      message: apiError?.message || error.message || 'An unexpected error occurred',
      details: apiError?.details,
    };

    console.error('API Error:', formattedError);
    throw formattedError;
  }
);

// ---------------------------------------------------------------------------
// SSE stream
// ---------------------------------------------------------------------------
export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Create a connection to stream AI-generated story content
 * @param roomId - The room ID to stream from
 * @param callbacks - Callbacks for handling stream events
 * @returns Cleanup function to close the stream
 */
const createStoryStream = (
  roomId: string,
  callbacks: StreamCallbacks
): (() => void) => {
  const eventSource = new EventSource(`${API_BASE_URL}/api/story/stream/${roomId}`);

  eventSource.onmessage = (event) => {
    const data = event.data;

    if (data === '[DONE]') {
      callbacks.onComplete();
      eventSource.close();
    } else if (data.startsWith('[ERROR]')) {
      const errorMessage = data.replace('[ERROR]', '').trim();
      callbacks.onError(new Error(errorMessage || 'Stream error occurred'));
      eventSource.close();
    } else {
      try {
        const parsed = JSON.parse(data);
        if (parsed.paragraph) {
          callbacks.onChunk(parsed.paragraph);
        }
      } catch (e) {
        console.warn('SSE parse error, raw data:', data.slice(0, 100), e);
      }
    }
  };

  eventSource.onerror = (event) => {
    console.error('SSE error:', event);
    callbacks.onError(new Error('Stream connection error'));
    eventSource.close();
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
};

// ---------------------------------------------------------------------------
// Auth helper — build body payload with player_token for Body(embed=True) endpoints
// ---------------------------------------------------------------------------
const tokenBody = (playerToken?: string | null): Record<string, string | undefined> =>
  ({ player_token: playerToken ?? undefined });

// ---------------------------------------------------------------------------
// GameApi
// ---------------------------------------------------------------------------
export const GameApi = {
  // -- Room management ------------------------------------------------------

  /**
   * Create a new game room
   */
  createRoom: async (data: CreateRoomRequest): Promise<CreateRoomResponse> => {
    const response = await apiClient.post<CreateRoomResponse>('/api/rooms/create', data);
    return response.data;
  },

  /**
   * Join an existing room
   */
  joinRoom: async (data: JoinRoomRequest): Promise<JoinRoomResponse> => {
    const response = await apiClient.post<JoinRoomResponse>('/api/rooms/join', data);
    return response.data;
  },

  /**
   * Start the game in a room
   */
  startGame: async (roomId: string, playerToken?: string | null): Promise<StartGameResponse> => {
    const response = await apiClient.post<StartGameResponse>(`/api/rooms/${roomId}/start`, tokenBody(playerToken));
    return response.data;
  },

  /**
   * Get current state of a room
   */
  getRoomState: async (roomId: string): Promise<RoomStateResponse> => {
    const response = await apiClient.get<RoomStateResponse>(`/api/rooms/${roomId}/state`);
    return response.data;
  },

  /**
   * Delete a room
   */
  deleteRoom: async (roomId: string, playerToken?: string | null): Promise<void> => {
    await apiClient.delete(`/api/rooms/${roomId}`, { data: tokenBody(playerToken) });
  },

  // -- Gameplay -------------------------------------------------------------

  /**
   * Submit a story continuation input
   */
  submitInput: async (data: SubmitInputRequest): Promise<SubmitInputResponse> => {
    const response = await apiClient.post<SubmitInputResponse>('/api/input/submit', data);
    return response.data;
  },

  /**
   * Cast a vote for a player's input
   */
  castVote: async (data: CastVoteRequest): Promise<{ status: string }> => {
    const response = await apiClient.post<{ status: string }>('/api/voting/cast', data);
    return response.data;
  },

  /**
   * Get voting results
   */
  getVotingResults: async (roomId: string): Promise<VotingResultsResponse> => {
    const response = await apiClient.get<VotingResultsResponse>(`/api/voting/results/${roomId}`);
    return response.data;
  },

  /**
   * Advance to next turn
   */
  advanceTurn: async (roomId: string, playerToken?: string | null): Promise<AdvanceTurnResponse> => {
    const response = await apiClient.post<AdvanceTurnResponse>(`/api/turn/advance/${roomId}`, tokenBody(playerToken));
    return response.data;
  },

  /**
   * Trigger input phase timeout
   */
  triggerInputTimeout: async (roomId: string, playerToken?: string | null): Promise<{ status: string; room_id: string; phase: string }> => {
    const response = await apiClient.post<{ status: string; room_id: string; phase: string }>(`/api/rooms/${roomId}/timeout`, tokenBody(playerToken));
    return response.data;
  },

  /**
   * Trigger voting phase timeout
   */
  triggerVotingTimeout: async (roomId: string, playerToken?: string | null): Promise<{
    status: string;
    room_id: string;
    winner: string;
    votes_received: Record<string, number>;
  }> => {
    const response = await apiClient.post(`/api/voting/${roomId}/timeout`, tokenBody(playerToken));
    return response.data;
  },

  /**
   * Get timer status
   */
  getTimerStatus: async (roomId: string): Promise<{
    active: boolean;
    time_remaining?: number;
    has_timed_out?: boolean;
    submitted_count?: number;
    total_players?: number;
    timed_out_players?: string[];
  }> => {
    const response = await apiClient.get(`/api/rooms/${roomId}/timer`);
    return response.data;
  },

  /**
   * End the game (when story has [END] flag)
   */
  endGame: async (roomId: string, playerToken?: string | null): Promise<{
    status: string;
    room_id: string;
    final_scores: Record<string, number>;
  }> => {
    const response = await apiClient.post(`/api/game/end/${roomId}`, tokenBody(playerToken));
    return response.data;
  },

  // -- SSE ------------------------------------------------------------------

  /**
   * Create a connection to stream AI-generated story content
   */
  createStoryStream,
};
