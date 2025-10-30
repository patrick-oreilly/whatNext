# Repository Guidelines

## Project Structure & Module Organization
- `backend/` — FastAPI service with agent prompts, core config/models, game management, and session modules.
- `web_frontend/` — React + Vite client; feature folders live under `src/`, assets in `public/`, builds land in `dist/`.
- `WhatNextFront/` — SwiftUI prototype tracked by `WhatNext.xcodeproj`; reference `Frontend_helper.md` when updating screens.
- Docs in `GAME_FLOW.md`, `VOTING_*`, and `Images/` define the canonical game flow—review them before gameplay changes.

## Build, Test, and Development Commands
- Backend: run `python -m backend.api_server` from the repo root; `uvicorn backend.api_server:app --reload --host 0.0.0.0 --port 8080` provides hot reload; execute `pytest` inside `backend/`.
- Frontend: from `web_frontend/`, `npm run dev` serves http://localhost:5173, `npm run build` emits `dist/`, and `npm run lint` enforces the ESLint + TypeScript setup.
- iOS: open `WhatNextFront/WhatNext.xcodeproj` in Xcode 15+, and point the API client to your running backend.

## Coding Style & Naming Conventions
- Python: follow PEP 8, four-space indents, and type hints; mirror docstrings/log formatting in `backend/api_server.py`, including the `INSTANCE_ID` prefix.
- React/TypeScript: stick to functional components, hooks, ESLint defaults, and Tailwind utilities; keep camelCase filenames and reuse types from `src/types/`.
- SwiftUI: PascalCase types and camelCase members; align with the folder scheme in `Frontend_helper.md`.

## Testing Guidelines
- Backend tests belong in `backend/tests/` as `test_*.py`; cover room lifecycle, voting edge cases, and SSE fallbacks with `pytest` and `pytest-asyncio`.
- Frontend tests should sit alongside components as `*.test.tsx` using Vitest; pair lint reports with manual room-creation smoke runs until the suite matures.

## Commit & Pull Request Guidelines
- Use short, present-tense commit subjects (e.g., `Remove DS store`, `Updated frontend`) and isolate logical changes.
- PRs should outline scope, touched surfaces (backend/web/iOS), test or lint evidence, config changes, and screenshots for UI tweaks; link issues and note follow-ups.

## Environment & Configuration Notes
- Backend reads `.env` for `GOOGLE_API_KEY`; optional overrides include `HOST`, `PORT`, `INSTANCE_ID`, and storage settings in `backend/core/config.py`.
- Frontend uses `.env` or `.env.local` with `VITE_API_BASE_URL`; never commit secrets.
- Start the backend before the web client so SSE and voting requests resolve without CORS workarounds.
