import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { GameApi } from './GameApi';
import { StoryLineType } from '../types/game';

vi.mock('axios', () => {
  const mockAxiosInstance = {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      response: {
        use: vi.fn(),
      },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      __mockInstance: mockAxiosInstance,
    },
    AxiosError: class extends Error {
      response?: { data: unknown };
      constructor(message: string) {
        super(message);
      }
    },
  };
});

const mockAxios = (axios as unknown as { __mockInstance: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } }).__mockInstance;

describe('GameApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- Room management ------------------------------------------------------

  describe('createRoom', () => {
    it('should create a room and return the response', async () => {
      const mockResponse = { data: { room_id: 'ABC123', storyline: 'hoop_dreams', status: 'created' } };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.createRoom({ storyline: StoryLineType.HOOP_DREAMS, max_turns: 10 });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/rooms/create', { storyline: 'hoop_dreams', max_turns: 10 });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('joinRoom', () => {
    it('should join a room and return the response', async () => {
      const mockResponse = { data: { room_id: 'ABC123', players: ['Alice'], status: 'joined' } };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.joinRoom({ room_id: 'ABC123', player_name: 'Alice' });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/rooms/join', { room_id: 'ABC123', player_name: 'Alice' });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('startGame', () => {
    it('should start a game and return the response', async () => {
      const mockResponse = { data: { status: 'started', room_id: 'ABC123', turn: 1, phase: 'player_input' } };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.startGame('ABC123');

      expect(mockAxios.post).toHaveBeenCalledWith('/api/rooms/ABC123/start');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getRoomState', () => {
    it('should fetch room state', async () => {
      const mockResponse = { data: { room_id: 'ABC123', phase: 'lobby', players: ['Alice'], scores: {}, turn: 0, story_history: [], player_inputs: [], max_turns: 10 } };
      mockAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.getRoomState('ABC123');

      expect(mockAxios.get).toHaveBeenCalledWith('/api/rooms/ABC123/state');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('deleteRoom', () => {
    it('should delete a room', async () => {
      mockAxios.delete.mockResolvedValueOnce({});

      await GameApi.deleteRoom('ABC123');

      expect(mockAxios.delete).toHaveBeenCalledWith('/api/rooms/ABC123');
    });
  });

  // -- Gameplay -------------------------------------------------------------

  describe('submitInput', () => {
    it('should submit player input', async () => {
      const mockResponse = { data: { status: 'submitted', submissions: 1, total_players: 2, phase: 'player_input' } };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.submitInput({ room_id: 'ABC123', player_name: 'Alice', input_text: 'Hello' });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/input/submit', { room_id: 'ABC123', player_name: 'Alice', input_text: 'Hello' });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('castVote', () => {
    it('should cast a vote', async () => {
      const mockResponse = { data: { status: 'voted' } };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.castVote({ room_id: 'ABC123', voter: 'Alice', chosen_player: 'Bob' });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/voting/cast', { room_id: 'ABC123', voter: 'Alice', chosen_player: 'Bob' });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getVotingResults', () => {
    it('should fetch voting results', async () => {
      const mockResponse = { data: { room_id: 'ABC123', winning_player: 'Bob', winning_input: 'Winning text', vote_counts: { Bob: 2, Alice: 1 } } };
      mockAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.getVotingResults('ABC123');

      expect(mockAxios.get).toHaveBeenCalledWith('/api/voting/results/ABC123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('advanceTurn', () => {
    it('should advance the turn', async () => {
      const mockResponse = { data: { status: 'advanced', turn: 2, phase: 'player_input' } };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.advanceTurn('ABC123');

      expect(mockAxios.post).toHaveBeenCalledWith('/api/turn/advance/ABC123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('triggerInputTimeout', () => {
    it('should trigger input timeout', async () => {
      const mockResponse = { data: { status: 'timeout', room_id: 'ABC123', phase: 'voting' } };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.triggerInputTimeout('ABC123');

      expect(mockAxios.post).toHaveBeenCalledWith('/api/rooms/ABC123/timeout');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('triggerVotingTimeout', () => {
    it('should trigger voting timeout', async () => {
      const mockResponse = { data: { status: 'timeout', room_id: 'ABC123', winner: 'Bob', votes_received: { Bob: 2 } } };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.triggerVotingTimeout('ABC123');

      expect(mockAxios.post).toHaveBeenCalledWith('/api/voting/ABC123/timeout');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getTimerStatus', () => {
    it('should fetch timer status', async () => {
      const mockResponse = { data: { active: true, time_remaining: 30, submitted_count: 1, total_players: 2 } };
      mockAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.getTimerStatus('ABC123');

      expect(mockAxios.get).toHaveBeenCalledWith('/api/rooms/ABC123/timer');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('endGame', () => {
    it('should end the game', async () => {
      const mockResponse = { data: { status: 'ended', room_id: 'ABC123', final_scores: { Alice: 5, Bob: 3 } } };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await GameApi.endGame('ABC123');

      expect(mockAxios.post).toHaveBeenCalledWith('/api/game/end/ABC123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // -- SSE ------------------------------------------------------------------

  describe('createStoryStream', () => {
    let mockEventSource: {
      onmessage: ((event: { data: string }) => void) | null;
      onerror: ((event: Event) => void) | null;
      close: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockEventSource = {
        onmessage: null,
        onerror: null,
        close: vi.fn(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).EventSource = vi.fn(() => mockEventSource);
    });
  
    afterEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).EventSource;
    });

    it('should return a cleanup function', () => {
      const cleanup = GameApi.createStoryStream('ABC123', {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      });

      expect(typeof cleanup).toBe('function');
    });

    it('should call onChunk for paragraph data', () => {
      const onChunk = vi.fn();
      GameApi.createStoryStream('ABC123', { onChunk, onComplete: vi.fn(), onError: vi.fn() });

      mockEventSource.onmessage!({ data: JSON.stringify({ paragraph: 'Hello world' }) });

      expect(onChunk).toHaveBeenCalledWith('Hello world');
    });

    it('should call onComplete on [DONE]', () => {
      const onComplete = vi.fn();
      GameApi.createStoryStream('ABC123', { onChunk: vi.fn(), onComplete, onError: vi.fn() });

      mockEventSource.onmessage!({ data: '[DONE]' });

      expect(onComplete).toHaveBeenCalled();
      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('should call onError on [ERROR]', () => {
      const onError = vi.fn();
      GameApi.createStoryStream('ABC123', { onChunk: vi.fn(), onComplete: vi.fn(), onError });

      mockEventSource.onmessage!({ data: '[ERROR] Something went wrong' });

      expect(onError).toHaveBeenCalledWith(new Error('Something went wrong'));
      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('should call onError on SSE connection error', () => {
      const onError = vi.fn();
      GameApi.createStoryStream('ABC123', { onChunk: vi.fn(), onComplete: vi.fn(), onError });

      mockEventSource.onerror!(new Event('error'));

      expect(onError).toHaveBeenCalledWith(new Error('Stream connection error'));
      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('should clean up when cleanup function is called', () => {
      const cleanup = GameApi.createStoryStream('ABC123', {
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      });

      cleanup();

      expect(mockEventSource.close).toHaveBeenCalled();
    });
  });
});
