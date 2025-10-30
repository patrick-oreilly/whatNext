// Gameplay API calls

import { apiClient } from './client';
import type {
  SubmitInputRequest,
  SubmitInputResponse,
  CastVoteRequest,
  VotingResultsResponse,
  AdvanceTurnResponse,
} from '../types';

export const gameplayApi = {
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
  advanceTurn: async (roomId: string): Promise<AdvanceTurnResponse> => {
    const response = await apiClient.post<AdvanceTurnResponse>(`/api/turn/advance/${roomId}`);
    return response.data;
  },

  /**
   * Trigger input phase timeout
   */
  triggerInputTimeout: async (roomId: string): Promise<{ status: string; room_id: string; phase: string }> => {
    const response = await apiClient.post<{ status: string; room_id: string; phase: string }>(`/api/rooms/${roomId}/timeout`);
    return response.data;
  },

  /**
   * Trigger voting phase timeout
   */
  triggerVotingTimeout: async (roomId: string): Promise<{
    status: string;
    room_id: string;
    winner: string;
    votes_received: Record<string, number>;
  }> => {
    const response = await apiClient.post(`/api/voting/${roomId}/timeout`);
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
  endGame: async (roomId: string): Promise<{
    status: string;
    room_id: string;
    final_scores: Record<string, number>;
  }> => {
    const response = await apiClient.post(`/api/game/end/${roomId}`);
    return response.data;
  },
};
