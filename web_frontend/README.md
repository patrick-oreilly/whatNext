# What's Next - Web Frontend

## Overview

The web frontend for the &quot;What's Next&quot; collaborative storytelling game. This React application provides an engaging multiplayer interface for creating and joining rooms, submitting story continuations, voting on ideas, and experiencing AI-generated narratives. It connects to the FastAPI backend via REST APIs and Server-Sent Events (SSE) for real-time updates.

## Features

- **Landing Page**: Introduction to the game with options to create or join a room.
- **Room Management**: Create rooms with storyline selection and max turns; join via room code.
- **Lobby**: Real-time player list, room code sharing, and game start (host only).
- **Gameplay**:
  - AI story introduction with streaming text.
  - Player input phase for story continuations (with character limits).
  - Anonymous voting on submissions.
  - AI continuation of the winning idea.
  - Live scoreboard updates.
- **Game Over**: Full story transcript, final scores, and replay options.
- Responsive design for mobile and desktop.
- Persistent player names via localStorage.
- Error handling and loading states.

## Tech Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router DOM
- **API Client**: Axios
- **Real-time**: EventSource (SSE) for story streaming; polling for room state
- **Dev Tools**: ESLint, Prettier, Vitest (testing setup ready)

## Prerequisites

- Node.js (v18+) and npm/yarn
- Backend server running (see `../backend/README.md` for setup)
- Default backend URL: `http://localhost:8080`

## Quick Start

1. Navigate to the frontend directory:
   ```
   cd web_frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment (copy example):
   ```
   cp .env.example .env
   ```
   Edit `.env` if backend URL differs (e.g., `VITE_API_BASE_URL=http://localhost:8080`).

4. Run development server:
   ```
   npm run dev
   ```
   Open http://localhost:5173 in your browser.

5. (Optional) Run linting:
   ```
   npm run lint
   ```

## Scripts

- `npm run dev`: Start dev server with hot reload
- `npm run build`: Build for production (output in `dist/`)
- `npm run preview`: Preview production build
- `npm run lint`: Lint code with ESLint
- `npm run lint:fix`: Auto-fix lint issues

## Project Structure

```
web_frontend/
├── public/          # Static assets
├── src/
│   ├── api/         # API services (rooms, gameplay, stream)
│   ├── components/  # UI components (common, game, lobby, layout)
│   ├── hooks/       # Custom hooks (SSE, polling, localStorage)
│   ├── pages/       # Route-based pages (Home, CreateRoom, Game, etc.)
│   ├── store/       # Zustand stores (gameStore)
│   ├── types/       # TypeScript interfaces
│   ├── utils/       # Helpers (validation, formatters)
│   ├── App.tsx      # Root app
│   └── main.tsx     # Entry point
├── .env.example     # Environment template
├── tailwind.config.js # Tailwind config
├── vite.config.ts   # Vite config
└── package.json     # Dependencies and scripts
```

## Implementation Status

Core features are implemented up to basic game flow (Phases 1-11 complete per [FRONTEND_IMPLEMENTATION_PLAN.md](../FRONTEND_IMPLEMENTATION_PLAN.md)). Currently focusing on polish, UX enhancements, testing, and deployment.

- Implemented: Room creation/join, lobby, player input, voting, scoreboard, story streaming, game over.
- In Progress: Animations, mobile optimizations, error boundaries.
- Pending: Full testing suite, production deployment.

For detailed progress, see [FRONTEND_IMPLEMENTATION_PLAN.md](../FRONTEND_IMPLEMENTATION_PLAN.md) and [GAME_FLOW.md](../GAME_FLOW.md).

## Testing

Unit and integration tests can be added using Vitest. Run with:
```
npm test
```
E2E testing setup with Playwright is recommended for full game flows.

## Deployment

1. Build the app: `npm run build`
2. Deploy `dist/` to a static host (Vercel, Netlify, etc.).
3. Set `VITE_API_BASE_URL` to your production backend.
4. Ensure CORS is configured on the backend.

Recommended: Vercel for automatic deploys from GitHub.

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please follow existing code style and add tests for new features.

## Issues & Support

- Report bugs or request features at [GitHub Issues](https://github.com/sst/opencode/issues) (or your repo).
- For backend integration, refer to `../backend/README.md`.
- Game logic: See [GAME_FLOW.md](../GAME_FLOW.md).

## License

MIT License - see [LICENSE](LICENSE) file (add if needed).

---

Built with ❤️ for collaborative storytelling!
