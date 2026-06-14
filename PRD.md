# Product Requirements Document: What Next?

## 1. Executive Summary
**What Next?** is a collaborative, turn-based narrative adventure game that acts as a digital tabletop roleplaying experience. By leveraging real-time AI generation, players participate in shaping a unique branching story alongside an AI Game Master. The MVP focuses on a seamless, real-time multiplayer experience across different devices, bringing friends together to craft and vote on engaging story continuations.

## 2. Mission
- Provide an engaging, frictionless collaborative storytelling experience.
- Seamlessly integrate generative AI to act as a responsive and creative Game Master.
- Foster social connection through turn-based creativity and voting mechanics.

## 3. Target Users
- **Friend Groups & Party Gamers:** Looking for casual, socially engaging local or remote games (similar to Jackbox Games).
- **Tabletop RPG Fans:** Players who enjoy narrative-driven games but want a lower barrier to entry.
- **Creative Writers:** Individuals who enjoy collaborative storytelling prompts.

## 4. MVP Scope
### Core Functionality
- ✅ Room creation and joining via room codes (2-10 players)
- ✅ Turn-based gameplay loop (AI prompt -> Player inputs -> Voting -> AI continuation)
- ✅ Real-time AI story generation streaming via Server-Sent Events (SSE)
- ✅ Preset story themes (Hoop Dreams, Space Exploration, Casino Heist, Haunted Mansion, Custom)
### Technical
- ✅ FastAPI backend with Google ADK (Gemini 2.0 Flash Live)
- ✅ In-memory room state management
- ✅ Multi-client frontend support initialization
### Integration & Deployment
- ✅ Google Cloud Run deployment for backend
- ❌ Persistent database for user accounts and historical stories (Out of scope for MVP)
- ❌ Monetization and in-app purchases (Out of scope for MVP)

## 5. User Stories
- **As a host**, I want to create a game room and select a theme, so that I can guide the flavor of the adventure for my friends.
- **As a player**, I want to join a game using a simple room code, so that I can easily connect without creating an account.
- **As a player**, I want to read the AI's story generated in real-time smoothly, so that I feel immersed in the narrative.
- **As a player**, I want to submit my own continuation idea anonymously, so that I can creatively influence the story without pressure.
- **As a player**, I want to vote on the provided submissions, so that the group democratically decides the best path forward.

## 6. Core Architecture & Patterns
- **Client-Server Model**: Lightweight frontends communicating with a centralized backend API.
- **Real-Time Streaming**: Server-Sent Events (SSE) for the typewriter effect during AI story generation.
- **Stateless/In-Memory Backend**: The backend currently relies on in-memory storage for room states, allowing for fast, localized game sessions.
- **Cross-Platform Compatibility**: Parallel development structure for Web, iOS Native, and Kotlin Multiplatform mobile apps.

## 7. Tools/Features
- **Game Phases Management**: Lobby, Generating Story, Player Input, Voting, Game Over.
- **StoryParser Utility**: A frontend utility to cleanly separate AI narrative from decision prompts and player status.
- **Agent Prompting System**: Backend prompts configured to adapt to different storylines and enforce gameplay rules.

## 8. Technology Stack
- **Backend**: Python 3.13+, FastAPI, Uvicorn, Google ADK, Gemini 2.0 Flash Live.
- **Web Frontend**: React, Vite, Tailwind CSS, TypeScript.
- **iOS Native Frontend**: Swift 5.0+, iOS 15.0+, SwiftUI.
- **Cross-Platform Mobile**: Kotlin Multiplatform (Compose Multiplatform).
- **Deployment**: Google Cloud Run, Vercel (for Web).

## 9. Security & Configuration
- **Authentication**: Anonymous room-based sessions (no user accounts needed for play).
- **Configuration**: Environment variables mapped via `.env` (e.g., `GOOGLE_API_KEY`, `HOST`, `PORT`, `MAX_PLAYERS`).
- **Security Scope**: Basic rate limiting and input sanitization (In-scope). Secure user data storage (Out-of-scope).

## 10. API Specification
- **Room Management**: `POST /api/rooms/create`, `POST /api/rooms/join`, `POST /api/rooms/{room_id}/start`, `GET /api/rooms/{room_id}/state`
- **Gameplay**: `POST /api/input/submit`, `POST /api/voting/cast`, `POST /api/turn/advance/{room_id}`
- **AI Streaming**: `GET /api/story/stream/{room_id}`

## 11. Success Criteria
- ✅ Players can smoothly connect and play a full 10-turn game from start to finish without state desyncs.
- ✅ AI generation latency and streaming are responsive with consistent generation.
- ✅ Clean, intuitive UI/UX for text input and voting on mobile devices (the primary interface).

## 12. Implementation Phases
- **Phase 1: Foundation (Current)**
  - ✅ Backend core logic and Gemini integration.
  - ✅ In-memory room state and API endpoints.
- **Phase 2: Client MVP**
  - ✅ Web and/or iOS frontend connecting to backend.
  - ✅ SSE implementation for smooth reading.
- **Phase 3: Polish & Deployment**
  - ✅ Cloud deployment setup.
  - ❌ UI animations and final visual polish.
  - ❌ Stress testing concurrency for multiple active rooms.

## 13. Future Considerations
- Persistent storage for saving favorite stories to share or re-read later.
- User accounts and progression tracking.
- Voice-to-text input to speed up playing turns.
- AI-generated background music and imagery based on current story state.

## 14. Risks & Mitigations
- **Risk**: API Rate limits or costs with Gemini 2.0 Flash Live.
  - **Mitigation**: Implement strict turn limits (e.g., max 10 turns) and aggressive idle cleanup mechanisms.
- **Risk**: Desynchronization between players during the voting or input phases.
  - **Mitigation**: Strong heartbeat polling mechanism and robust backend state validation.
- **Risk**: Fragmented frontend development (Web, iOS Native, KMP).
  - **Mitigation**: Focus efforts on one primary client for the MVP release before finalizing all of them.
