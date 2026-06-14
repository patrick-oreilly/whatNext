import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GeneratingStoryPhase } from './GeneratingStoryPhase';

// Mock the game store
const mockRoomState = {
  room_id: 'TEST123',
  storyline: 'hoop_dreams' as const,
  players: ['Alice', 'Bob'],
  scores: { Alice: 0, Bob: 0 },
  turn: 1,
  phase: 'generating_story' as const,
  story_history: [] as Array<{
    turn: number;
    content: {
      paragraph: string;
      status: string | null;
      decision: string | null;
      has_story_ended: boolean;
      ending_summary?: string | null;
    };
    winning_player: string | null;
    timestamp: string;
  }>,
  player_inputs: [],
  max_turns: 10,
};

vi.mock('../../store/gameStore', () => ({
  useGameStore: vi.fn(() => ({
    roomState: mockRoomState,
  })),
}));

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Mock GameApi
const mockCleanup = vi.fn();

let mockOnChunk: (text: string) => void;
let mockOnComplete: () => void;
let mockOnError: (error: Error) => void;

vi.mock('../../api/GameApi', () => ({
  GameApi: {
    createStoryStream: vi.fn((_roomId: string, callbacks: {
      onChunk: (text: string) => void;
      onComplete: () => void;
      onError: (error: Error) => void;
    }) => {
      mockOnChunk = callbacks.onChunk;
      mockOnComplete = callbacks.onComplete;
      mockOnError = callbacks.onError;
      return mockCleanup;
    }),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
  };
});

// Mock common components
vi.mock('../common/Icon', () => ({
  Icon: () => null,
}));

vi.mock('../common', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void; size?: string; className?: string }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Spinner: () => <div data-testid="spinner" />,
}));

describe('GeneratingStoryPhase', () => {
  const mockOnContinue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the story header', () => {
    render(
      <GeneratingStoryPhase
        roomId="TEST123"
        onContinue={mockOnContinue}
      />
    );
    expect(screen.getByText('The Story So Far...')).toBeDefined();
  });

  it('starts streaming when phase is generating_story', async () => {
    const { GameApi } = await import('../../api/GameApi');

    render(
      <GeneratingStoryPhase
        roomId="TEST123"
        onContinue={mockOnContinue}
      />
    );

    expect(GameApi.createStoryStream).toHaveBeenCalled();
  });

  it('shows streaming indicator while streaming', () => {
    render(
      <GeneratingStoryPhase
        roomId="TEST123"
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('AI is creating the story...')).toBeDefined();
  });

  it('shows Continue button when streaming completes with text', () => {
    render(
      <GeneratingStoryPhase
        roomId="TEST123"
        onContinue={mockOnContinue}
      />
    );

    act(() => {
      mockOnChunk('Once upon a time...');
    });
    act(() => {
      mockOnComplete();
    });

    expect(screen.getByText('Continue')).toBeDefined();
  });

  it('does not show Continue button when no text was streamed', () => {
    render(
      <GeneratingStoryPhase
        roomId="TEST123"
        onContinue={mockOnContinue}
      />
    );

    act(() => {
      mockOnComplete();
    });

    const continueBtn = screen.queryByText('Continue');
    expect(continueBtn).toBeNull();
  });

  it('calls onContinue when Continue button is clicked', () => {
    render(
      <GeneratingStoryPhase
        roomId="TEST123"
        onContinue={mockOnContinue}
      />
    );

    act(() => {
      mockOnChunk('Once upon a time...');
    });
    act(() => {
      mockOnComplete();
    });

    const continueBtn = screen.getByText('Continue');
    continueBtn.click();
    expect(mockOnContinue).toHaveBeenCalled();
  });

  it('handles stream error gracefully', () => {
    render(
      <GeneratingStoryPhase
        roomId="TEST123"
        onContinue={mockOnContinue}
      />
    );

    act(() => {
      mockOnError(new Error('Stream error'));
    });

    const streamingIndicator = screen.queryByText('AI is creating the story...');
    expect(streamingIndicator).toBeNull();
  });

  it('cleans up EventSource on unmount', () => {
    const { unmount } = render(
      <GeneratingStoryPhase
        roomId="TEST123"
        onContinue={mockOnContinue}
      />
    );

    unmount();
    expect(mockCleanup).toHaveBeenCalled();
  });
});
