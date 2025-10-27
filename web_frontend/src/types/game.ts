// Game domain types matching backend models

export const GamePhase = {
  LOBBY: 'lobby',
  GENERATING_STORY: 'generating_story',
  PLAYER_INPUT: 'player_input',
  VOTING: 'voting',
  GAME_OVER: 'game_over'
} as const;

export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

export const StoryLineType = {
  HOOP_DREAMS: 'hoop_dreams',
  SPACE_EXPLORATION: 'space_exploration',
  CASINO_HEIST: 'casino_heist',
  HAUNTED_MANSION: 'haunted_mansion',
  CUSTOM_STORYLINE: 'custom_storyline'
} as const;

export type StoryLineType = typeof StoryLineType[keyof typeof StoryLineType];

export const STORYLINE_LABELS: Record<StoryLineType, string> = {
  [StoryLineType.HOOP_DREAMS]: 'Hoop Dreams',
  [StoryLineType.SPACE_EXPLORATION]: 'Space Exploration',
  [StoryLineType.CASINO_HEIST]: 'Casino Heist',
  [StoryLineType.HAUNTED_MANSION]: 'Haunted Mansion',
  [StoryLineType.CUSTOM_STORYLINE]: 'Custom Storyline',
};

export const STORYLINE_DESCRIPTIONS: Record<StoryLineType, string> = {
  [StoryLineType.HOOP_DREAMS]: 'Follow your journey from youth basketball to NBA stardom',
  [StoryLineType.SPACE_EXPLORATION]: 'Explore the cosmos and encounter alien civilizations',
  [StoryLineType.CASINO_HEIST]: 'Plan and execute the perfect casino heist',
  [StoryLineType.HAUNTED_MANSION]: 'Uncover the secrets of a mysterious haunted mansion',
  [StoryLineType.CUSTOM_STORYLINE]: 'Create your own unique adventure',
};

export interface PlayerInput {
  player_name: string;
  text: string;
  votes: number;
  voters: string[];
  timestamp: string;
}

export interface StorySegment {
  turn: number;
  content: string;
  winning_player: string | null;
  timestamp: string;
}

export interface RoomState {
  room_id: string;
  storyline: StoryLineType;
  players: string[];
  scores: Record<string, number>;
  turn: number;
  phase: GamePhase;
  story_history: StorySegment[];
  player_inputs: PlayerInput[];
  max_turns: number;
  input_phase_start_time?: string | null;
  timed_out_players?: string[];
}
