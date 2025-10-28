# What's Next Web Frontend Guide

This guide explains the web frontend logic for the \"What's Next\" AI storytelling game. It's structured for easy listening: short sections, clear headings, and bullet points. The app is a React single-page application built with Vite, TypeScript, Tailwind CSS, and Zustand for state. It handles multiplayer rooms, player inputs, voting, and AI story streaming via a FastAPI backend.

## 1. Overview and Tech Stack

The frontend creates an engaging multiplayer experience for collaborative storytelling. Players create or join rooms, submit story ideas, vote anonymously, and watch AI weave winners into narratives.

- **Core Technologies**:
  - React 18+ with TypeScript for components and hooks.
  - Vite for fast builds and hot reloads.
  - Tailwind CSS for styling (dark theme with accents: black/white/primary colors).
  - React Router for client-side routing.
  - Zustand for lightweight global state (room data, player info).
  - Axios for REST APIs; EventSource for Server-Sent Events (SSE) streaming.
  - Custom hooks for polling, localStorage, background music.
  - React Markdown for rendering AI story text.

- **Key Features**:
  - Real-time updates via polling (2-3s intervals) and SSE for story generation.
  - Responsive design: Mobile-friendly with animations (Framer Motion).
  - Validation: Client-side checks for names, inputs, room codes.
  - Persistence: Player names saved in localStorage.
  - Error Handling: User-friendly messages for API failures (e.g., room full, game started).

- **Environment**:
  - Dev server: `npm run dev` (localhost:5173).
  - API Base: Configurable via `.env` (default: localhost:8080).
  - Dependencies: React Router, Axios, Zustand, React Markdown, Tailwind.

## 2. Project Structure

The code is organized for modularity. Key folders:

- **public/**: Static assets (logos, music like sunflower-west.mp3 for specific storylines).
- **src/api/**: API modules.
  - client.ts: Axios instance with error intercepting.
  - rooms.ts: Create/join/start rooms, get state.
  - gameplay.ts: Submit inputs, cast votes, advance turns, handle timeouts.
  - stream.ts: SSE for live story generation.
- **src/components/**: Reusable UI.
  - common/: Button, Card, Input, Modal, Spinner (basic building blocks).
  - game/: PlayerInput (text submission), VotingPanel (options with votes), StoryDisplay (markdown rendering with streaming), Scoreboard, StatusDisplay, InputTimer.
  - layout/: Header (logo/nav), Footer (copyright), Layout (wraps pages with analytics).
  - lobby/: PlayerList (with host badges), RoomCode (copyable code).
- **src/hooks/**:
  - useSSE.ts: Manages EventSource for streaming story chunks.
  - usePolling.ts: Periodic API calls (e.g., room state every 2-3s).
  - useBackgroundMusic.ts: Plays/loops audio based on storyline (e.g., Sunflower West).
  - useLocalStorage.ts: Persists player names.
- **src/pages/**: Route-based views.
  - Home.tsx: Landing with create/join buttons and \"How to Play\" cards.
  - CreateRoom.tsx/JoinRoom.tsx: Forms for room setup/joining.
  - Lobby.tsx: Player list, settings display, start button (host only).
  - Game.tsx: Core 3-screen flow (story gen, input, voting).
  - GameOver.tsx: Scores, full story transcript, download.
  - NotFound.tsx: 404 page.
- **src/store/**: gameStore.ts (Zustand: roomState, currentPlayer, loading/error).
- **src/types/**: api.ts (requests/responses), game.ts (phases, storylines, RoomState interface).
- **src/utils/**: constants.ts (API URL, limits like min players=2, max=10), formatters.ts (room codes, timestamps), storyHelpers.ts (parse AI text for decisions/status), validation.ts (name/input checks).
- **Root Files**: App.tsx (router), main.tsx (root render), package.json (scripts/deps), tailwind.config.js (custom colors/animations), vite.config.ts (plugins).

## 3. App Flow and Routing

The app uses BrowserRouter in App.tsx. All pages wrap in Layout.tsx (header/main/footer).

- **Routing Paths**:
  - `/`: Home (hero, how-to-play, features).
  - `/create`: Form for storyline (e.g., Hoop Dreams) and turns (5-20).
  - `/join`: Input name and 6-char room code.
  - `/lobby/:roomId`: Waiting room with polling.
  - `/game/:roomId`: Main gameplay (phases below).
  - `/gameover/:roomId`: End screen.
  - `*`: 404.

- **User Journey**:
  1. Home: Click \"Create Room\" → validate name/story/turns → POST /api/rooms/create → auto-join → navigate to lobby.
  2. Or \"Join Room\" → validate name/code → POST /api/rooms/join → navigate to lobby.
  3. Lobby: Poll GET /api/rooms/:id/state every 2s. Host starts game (POST /start). Min 2 players.
  4. Game: Poll state every 3s. Handles phases (see below). SSE for story streaming.
  5. Game Over: Fetch final state, show scores/story, download TXT.
  6. Errors: Redirect to home or show modals (e.g., room full).

- **Navigation**: useNavigate hook for programmatic redirects (e.g., phase change → new page).

## 4. State Management

Global state in gameStore.ts (Zustand):

- **Core State**:
  - roomState: Full RoomState (players, scores, turn, phase, story_history, player_inputs).
  - currentPlayer: String (from localStorage).
  - isLoading/error: Booleans/strings for UX.

- **Actions**:
  - setRoomState: Update from API.
  - setCurrentPlayer: Save to store/localStorage.
  - reset: Clear for new games.
  - updateRoomState: Partial merges.

- **Usage**: Pages/hooks subscribe (e.g., useGameStore(state => state.roomState)). Polling fetches/updates store.

Local state: useState for forms (e.g., input text, errors, loading spinners).

## 5. API Integration and Data Flow

Axios client in api/client.ts: Base URL from env, JSON headers, 30s timeout, error formatting (ApiError interface).

- **Room APIs (rooms.ts)**:
  - Create: POST /create {storyline, max_turns} → {room_id}.
  - Join: POST /join {room_id, player_name} → {players}.
  - Start: POST /:id/start (host only).
  - State: GET /:id/state → RoomState (polled).

- **Gameplay APIs (gameplay.ts)**:
  - Submit: POST /input/submit {room_id, player_name, input_text} → {submissions, total_players}.
  - Vote: POST /voting/cast {room_id, voter, chosen_player}.
  - Results: GET /voting/results/:id → {winning_player, vote_counts}.
  - Advance: POST /turn/advance/:id (after voting).
  - Timeout: POST /:id/timeout (if 120s input phase expires).

- **Streaming (stream.ts)**:
  - createStoryStream(roomId): EventSource to /api/story/stream/:id.
  - Handles chunks (onChunk: append text), [DONE] (complete), [ERROR] (fail).
  - useSSE hook: Manages start/stop, state (streamedText, isStreaming).

- **Data Flow**:
  - Polling: usePolling(fetchRoomState, interval) → API → setRoomState.
  - Phase Changes: Store detects phase/turn shift → UI updates (e.g., input → voting).
  - Streaming: Phase=GENERATING_STORY → startStream → append chunks to StoryDisplay.
  - Validation: Client-side before API; backend errors caught in interceptors.
  - Types: Strict interfaces (e.g., RoomState matches backend models).

## 6. Game Logic on Frontend

Game phases from types/game.ts: LOBBY, GENERATING_STORY, PLAYER_INPUT, VOTING, GAME_OVER.

- **Lobby Phase**:
  - Display: Room code (copyable), settings (storyline, turns, players/10), PlayerList (badges for you/host).
  - Logic: Poll state. Host: Start if ≥2 players. Others: Wait message.

- **Generating Story Phase** (AI Intro/Continuation)**:
  - Trigger: After start or advance.
  - UI: StoryDisplay shows history + streaming text (markdown, auto-scroll).
  - Logic: useSSE starts on phase+turn change. Chunks append live. On complete: \"Continue\" button → poll advances to input.

- **Player Input Phase** (120s Timer)**:
  - UI: Story context + decision prompt (parsed from last segment via storyHelpers.ts). PlayerInput textarea (10-500 chars). Progress: submissions/total.
  - Logic: Validate/submit → mark hasSubmitted. Poll updates count. Timeout: triggerInputTimeout if expired. Timed-out players skip voting.

- **Voting Phase**:
  - UI: Reminder prompt. VotingPanel: Buttons for others' inputs (exclude self). Show submitted/vote cast.
  - Logic: Poll checks all eligible voted (exclude timed-out). Then GET results → show winner/votes. \"Continue Story\" advances.
  - Voting: Anonymous, one per player. Winner gets point.

- **Game Over**:
  - Trigger: Turn > max_turns.
  - UI: Winner announcement, sorted scores, full story (markdown, downloadable TXT).

- **Cross-Phase**:
  - Scoreboard: Persistent sidebar with live scores.
  - Background Music: Plays for Sunflower West storyline.
  - Helpers: storyHelpers.ts parses AI text ([DECISION] for prompts, Status: for display). cleanStoryText removes markers.

## 7. UI Components and UX

- **Common Patterns**:
  - Cards: Black borders, white text, hover effects.
  - Buttons: Variants (primary/outline), loading spinners, full-width.
  - Inputs: Labels, errors, helpers (e.g., char count).
  - Animations: Fade-ins, glows, scales (Tailwind + Framer Motion).

- **Responsive**: Grid cols (e.g., game: 3-col main + 1-col sidebar). Mobile stacks.

- **Accessibility**: Semantic HTML, ARIA labels implied via structure. Uppercase tracking for emphasis.

- **Edge Cases**:
  - No inputs: Empty states (e.g., \"No options to vote\").
  - Errors: Red banners (e.g., \"Room full\"). Redirects for invalid phases.
  - Offline: Polling retries; SSE errors stop stream.

## 8. Utils, Validation, and Types

- **Constants**: Limits (e.g., MAX_PLAYERS=10), intervals, storage keys, phase labels.
- **Formatters**: Uppercase room codes, timestamps, player colors (cycling blue/purple/etc.).
- **Validation**: Functions check lengths (e.g., name 1-20 chars). Errors shown inline.
- **Types**: Comprehensive (e.g., StoryLineType enum with labels/descriptions). Ensures API/store alignment.

## 9. Development and Best Practices

- **Linting**: ESLint for hooks/rules. Run `npm run lint`.
- **Build**: `npm run build` → dist/ for deploy.
- **Testing**: Setup ready (Vitest); add for components/APIs.
- **Conventions**: No comments in code. Mimic patterns (e.g., all pages use Cards). Security: No secrets in frontend.
- **Improvements**: Add E2E tests, more animations, PWA support.

This covers the frontend logic end-to-end. For backend integration, see GAME_FLOW.md. Total lines: ~5k, focused on clean, reactive multiplayer UX.