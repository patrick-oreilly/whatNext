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
};
