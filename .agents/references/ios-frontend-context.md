# iOS Frontend Context: What Next?

This document outlines the architecture, technology stack, and critical systems of the "What Next?" native iOS frontend. Agents should reference this context before modifying code.

## 1. Project Overview
**What Next?** is a collaborative, turn-based narrative adventure game. Players join a shared room and take turns guiding an AI-generated story. The backend uses Google's Gemini Flash Live, and the architecture emphasizes real-time Server-Sent Events (SSE) streaming and immediate multi-player synchronization.

## 2. Technology Stack
- **Language**: Swift 5.0+
- **UI Framework**: SwiftUI (Targeting iOS 15.0+)
- **Cross-Platform**: Includes targeted `#if os(macOS)` optimizations for macOS support based on `windowResizability`.
- **Backend Communication**: Standard `URLSession` utilizing async/await paradigms and manual JSON decoding mapped to a FastAPI backend.

## 3. Architecture Structure
The application employs an MVVM-like architecture combined with centralized state management.

- **`GameStateManager` (ViewModels/)**: The core engine of the frontend logic. It acts as an `ObservableObject` injected into the app root via `.environmentObject()`. It manages:
  - Phase states (`AppPhase`: .lobby, .generatingStory, .playerInput, .voting, etc.).
  - Polling for room state updates.
  - Streaming AI generation payload via SSE.
- **`APIService` (Services/)**: A singleton responsible for direct Network I/O.
  - Exposes modern `async/await` methods (`createRoom`, `joinRoom`, `submitInput`, `castVote`).
  - Implements a custom JSON decoder. The FastAPI backend sends `snake_case` properties, which are converted automatically to `camelCase` Swift models via `.convertFromSnakeCase`.
  - Parses strict and non-standard `ISO8601` timestamps from the Python backend.
- **Models (`Models/`)**: The location for data structures like `APIError`, `RoomState`, `JoinRoomResponse`, and game types configurations.
- **UI Views**: Located mostly in `GamePage/` and root folders. Includes `ContentView.swift`, `Lobby.swift`, `FindGame.swift`, and prompt screens.

## 4. Key Mechanics
- **Lobby Phase**: Handles session initialization and allows users to configure the game (theme/storyline choice).
- **Polling Loop vs SSE**:
  - The game heavily uses polling to sync players, but transitions into streaming mode using Server-Sent Events for real-time text generation, mimicking a typewriter effect via a `StoryParser` utility function.
- **Backend Constraints**: The backend operates ephemerally in-memory (for the MVP), making state localized per session. The game requires continuous connection and heartbeat maintenance.

## 5. Development Guidelines
- Always retrieve network configuration dynamically (base URL is configurable in `APIService.shared.baseURL`).
- Keep SwiftUI views modular, passing dependencies from `GameStateManager`.
- Adhere strictly to async/await syntax when implementing or expanding networking layers. Do not fall back to GCD callbacks.
- Pay attention to custom response decoding; if adding a new model struct, subclassing `Codable` is adequate, but ensure property names match `snake_case` mappings from the API layer without explicitly writing CodingKeys.
