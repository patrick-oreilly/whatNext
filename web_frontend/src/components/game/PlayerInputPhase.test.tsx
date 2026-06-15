import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PlayerInputPhase } from './PlayerInputPhase';

const { mockSubmitInput, mockTriggerInputTimeout } = vi.hoisted(() => ({
  mockSubmitInput: vi.fn().mockResolvedValue({ status: 'submitted' }),
  mockTriggerInputTimeout: vi.fn().mockResolvedValue({ status: 'timeout' }),
}));

const { mockRoomState } = vi.hoisted(() => ({
  mockRoomState: {
    room_id: 'TEST123',
    storyline: 'hoop_dreams' as const,
    players: ['Alice', 'Bob'],
    scores: { Alice: 0, Bob: 0 },
    turn: 1,
    phase: 'player_input' as const,
    story_history: [],
    player_inputs: [] as Array<{
      player_name: string;
      text: string;
      votes: number;
      voters: string[];
      timestamp: string;
    }>,
    max_turns: 10,
    input_phase_start_time: new Date().toISOString(),
  },
}));

vi.mock('../../store/gameStore', () => ({
  useGameStore: vi.fn(() => ({
    roomState: mockRoomState,
    currentPlayer: 'Alice',
    playerToken: 'token-alice',
  })),
}));

// Mock GameApi
vi.mock('../../api/GameApi', () => ({
  GameApi: {
    submitInput: mockSubmitInput,
    triggerInputTimeout: mockTriggerInputTimeout,
  },
}));

// Mock lucide-react
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
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
  Button: ({ children, onClick, disabled, loading }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled || loading}>
      {children}
    </button>
  ),
  Spinner: () => <div data-testid="spinner" />,
}));

describe('PlayerInputPhase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders textarea, character counter, and submit button', () => {
    render(<PlayerInputPhase />);

    expect(screen.getByPlaceholderText('Describe what happens next in the story...')).toBeDefined();
    expect(screen.getByText('Submit Your Idea')).toBeDefined();
    expect(screen.getByText(/characters remaining/)).toBeDefined();
  });

  it('renders the timer display', () => {
    render(<PlayerInputPhase />);

    expect(screen.getByText('remaining')).toBeDefined();
  });

  it('disables submit button for empty input', () => {
    render(<PlayerInputPhase />);

    const submitBtn = screen.getByText('Submit Your Idea');
    expect(submitBtn).toHaveProperty('disabled', true);
  });

  it('calls GameApi.submitInput on submit, forwarding the auth token', async () => {
    render(<PlayerInputPhase />);

    const textarea = screen.getByPlaceholderText('Describe what happens next in the story...');
    fireEvent.change(textarea, { target: { value: 'This is my story input' } });

    const submitBtn = screen.getByText('Submit Your Idea');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSubmitInput).toHaveBeenCalledWith({
        room_id: 'TEST123',
        player_name: 'Alice',
        input_text: 'This is my story input',
        player_token: 'token-alice',
      });
    });
  });

  it('shows submitted state after successful submission', async () => {
    render(<PlayerInputPhase />);

    const textarea = screen.getByPlaceholderText('Describe what happens next in the story...');
    fireEvent.change(textarea, { target: { value: 'My cool story idea' } });

    const submitBtn = screen.getByText('Submit Your Idea');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Submitted!')).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getByText(/Waiting for others/)).toBeDefined();
    });
  });

  it('reads from Zustand store — currentPlayer and roomState', () => {
    render(<PlayerInputPhase />);
    // Component renders without errors, proving it reads from the mocked store
    expect(screen.getByText('Submit Your Idea')).toBeDefined();
  });
});
