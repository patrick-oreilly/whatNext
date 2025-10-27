// Room management API calls

import { apiClient } from './client';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RoomStateResponse,
  StartGameResponse,
} from '../types';

export const roomsApi = {
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
  startGame: async (roomId: string): Promise<StartGameResponse> => {
    const response = await apiClient.post<StartGameResponse>(`/api/rooms/${roomId}/start`);
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
  deleteRoom: async (roomId: string): Promise<void> => {
    await apiClient.delete(`/api/rooms/${roomId}`);
  },
};
