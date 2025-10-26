# Backend-Frontend Integration Task Document
## Streaming AI Responses from Google ADK to iOS

**Objective**: Connect the iOS frontend (`WhatsNextFront`) to the Python backend (`backend/whats_next_agent`) to enable real-time streaming of AI-generated story content from the Google ADK agent to the game interface.

---

## Architecture Overview

### System Flow
```
iOS App → HTTP/WebSocket → Backend API → ADK Session → Gemini Model → Stream Response → iOS UI
```

### Key Design Decisions

**1. Session Management Strategy**
- One ADK `Session` per game room
- Session ID = Room ID (e.g., "121232")
- All player interactions within a room share the same session for story continuity

**2. Communication Protocol**
- **Phase 1** (MVP): Server-Sent Events (SSE) for streaming
- **Phase 2** (Full): WebSocket for bidirectional real-time communication
- SSE is simpler and ADK's streaming naturally supports it

**3. Backend Architecture**
- FastAPI server wrapping the ADK agent
- Endpoints for: create room, join room, send player input, stream AI response
- In-memory room state management (later: Redis/database)

---

## Part 1: Backend Implementation

### Task 1.1: Create FastAPI Server with ADK Integration

**File**: `backend/api_server.py`

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import asyncio
import uuid

from google.adk.agents import LlmAgent
from google.adk.sessions import Session
from whats_next_agent.agent import root_agent

app = FastAPI(title="What's Next Game Master API")

# CORS for local iOS development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (replace with Redis/DB in production)
game_rooms: Dict[str, Dict] = {}
adk_sessions: Dict[str, Session] = {}


class CreateRoomRequest(BaseModel):
    storyline: str = "hoop_dreams"  # Default storyline


class JoinRoomRequest(BaseModel):
    room_id: str
    player_name: str


class PlayerInputRequest(BaseModel):
    room_id: str
    player_name: str
    input_text: str


@app.post("/api/rooms/create")
async def create_room(request: CreateRoomRequest):
    """Create a new game room and initialize ADK session."""
    room_id = str(uuid.uuid4())[:6].upper()  # e.g., "A3F92C"

    # Create ADK session for this room
    session = Session()
    adk_sessions[room_id] = session

    # Initialize room state
    game_rooms[room_id] = {
        "room_id": room_id,
        "storyline": request.storyline,
        "players": [],
        "turn": 0,
        "scores": {},
        "story_history": [],
        "current_phase": "lobby",  # lobby, input, voting, ai_generating
    }

    return {"room_id": room_id, "status": "created"}


@app.post("/api/rooms/join")
async def join_room(request: JoinRoomRequest):
    """Add player to existing room."""
    if request.room_id not in game_rooms:
        raise HTTPException(status_code=404, detail="Room not found")

    room = game_rooms[request.room_id]

    if len(room["players"]) >= 4:
        raise HTTPException(status_code=400, detail="Room is full")

    if request.player_name in room["players"]:
        raise HTTPException(status_code=400, detail="Player name already taken")

    room["players"].append(request.player_name)
    room["scores"][request.player_name] = 0

    return {
        "room_id": request.room_id,
        "players": room["players"],
        "status": "joined"
    }


@app.post("/api/rooms/{room_id}/start")
async def start_game(room_id: str):
    """Start the game and generate opening story."""
    if room_id not in game_rooms:
        raise HTTPException(status_code=404, detail="Room not found")

    room = game_rooms[room_id]

    if len(room["players"]) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 players")

    room["current_phase"] = "ai_generating"
    room["turn"] = 1

    return {"status": "started", "turn": 1}


@app.get("/api/story/stream/{room_id}")
async def stream_story(room_id: str):
    """Stream AI-generated story content using Server-Sent Events."""
    if room_id not in game_rooms:
        raise HTTPException(status_code=404, detail="Room not found")

    if room_id not in adk_sessions:
        raise HTTPException(status_code=500, detail="Session not initialized")

    room = game_rooms[room_id]
    session = adk_sessions[room_id]

    # Determine the prompt based on turn number and player inputs
    turn = room["turn"]
    if turn == 1:
        # Opening story
        prompt = "Let's begin your basketball journey. Where does your story start?"
    else:
        # Continuation based on winning player input
        # (In full implementation, get this from voting results)
        prompt = room.get("winning_input", "Continue the story.")

    async def event_generator():
        """Generate Server-Sent Events from ADK stream."""
        try:
            # ADK streaming: send message and iterate over response chunks
            full_response = ""

            # Use ADK's streaming capability
            # Note: Exact API may vary - check ADK docs for streaming methods
            response_stream = root_agent.send_message_stream(
                session=session,
                message=prompt
            )

            for chunk in response_stream:
                # Extract text from chunk (format depends on ADK version)
                text_chunk = chunk.text if hasattr(chunk, 'text') else str(chunk)
                full_response += text_chunk

                # Format as SSE
                yield f"data: {text_chunk}\n\n"
                await asyncio.sleep(0.01)  # Small delay for smooth streaming

            # Store complete response in room history
            room["story_history"].append({
                "turn": turn,
                "content": full_response,
                "type": "ai_response"
            })

            # Signal end of stream
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.post("/api/input/submit")
async def submit_player_input(request: PlayerInputRequest):
    """Submit player's story continuation input."""
    if request.room_id not in game_rooms:
        raise HTTPException(status_code=404, detail="Room not found")

    room = game_rooms[request.room_id]

    # Store player input for voting phase
    if "player_inputs" not in room:
        room["player_inputs"] = []

    room["player_inputs"].append({
        "player": request.player_name,
        "text": request.input_text,
        "votes": 0
    })

    return {"status": "submitted"}


@app.get("/api/rooms/{room_id}/state")
async def get_room_state(room_id: str):
    """Get current room state for synchronization."""
    if room_id not in game_rooms:
        raise HTTPException(status_code=404, detail="Room not found")

    return game_rooms[room_id]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

**Installation Requirements**:
```bash
cd backend
pip install fastapi uvicorn python-multipart
```

**Run Server**:
```bash
cd backend
source .venv/bin/activate
python api_server.py
```

Server will run on `http://localhost:8080`

---

### Task 1.2: Verify ADK Streaming API

**Important**: The streaming implementation above assumes ADK has a `send_message_stream()` method. You need to verify the exact ADK API for streaming.

**Investigation Steps**:

1. Check ADK documentation for streaming: https://google.github.io/adk-docs/
2. Test streaming in ADK Dev UI: `adk web` and observe network requests
3. Look for methods like:
   - `agent.send_message_stream()`
   - `session.send_stream()`
   - `agent.generate_stream()`

**Alternative if direct streaming not available**:
```python
# Non-streaming fallback
response = root_agent.send_message(session=session, message=prompt)
full_text = response.text

# Simulate streaming by chunking
chunk_size = 5  # words per chunk
words = full_text.split()
for i in range(0, len(words), chunk_size):
    chunk = " ".join(words[i:i+chunk_size])
    yield f"data: {chunk} \n\n"
    await asyncio.sleep(0.05)
```

---

### Task 1.3: Add Health Check & Test Endpoints

Add to `api_server.py`:

```python
@app.get("/health")
async def health_check():
    """Verify server is running."""
    return {"status": "healthy", "agent": "ready"}


@app.get("/test/stream")
async def test_stream():
    """Test SSE streaming without ADK."""
    async def test_generator():
        test_story = "You step onto the court. The crowd roars. Your hands grip the ball tightly. What happens next?"
        words = test_story.split()
        for word in words:
            yield f"data: {word} \n\n"
            await asyncio.sleep(0.1)
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        test_generator(),
        media_type="text/event-stream"
    )
```

---

## Part 2: iOS Frontend Implementation

### Task 2.1: Create Network Layer with Streaming Support

**File**: `WhatsNextFront/WhatNext/WhatNext/Services/GameAPIService.swift`

```swift
import Foundation
import Combine

// MARK: - API Models

struct CreateRoomResponse: Codable {
    let roomId: String
    let status: String

    enum CodingKeys: String, CodingKey {
        case roomId = "room_id"
        case status
    }
}

struct JoinRoomRequest: Codable {
    let roomId: String
    let playerName: String

    enum CodingKeys: String, CodingKey {
        case roomId = "room_id"
        case playerName = "player_name"
    }
}

struct JoinRoomResponse: Codable {
    let roomId: String
    let players: [String]
    let status: String

    enum CodingKeys: String, CodingKey {
        case roomId = "room_id"
        case players
        case status
    }
}

struct RoomState: Codable {
    let roomId: String
    let players: [String]
    let turn: Int
    let scores: [String: Int]
    let storyHistory: [[String: Any]]?
    let currentPhase: String

    enum CodingKeys: String, CodingKey {
        case roomId = "room_id"
        case players
        case turn
        case scores
        case storyHistory = "story_history"
        case currentPhase = "current_phase"
    }
}

// MARK: - API Service

class GameAPIService: ObservableObject {
    static let shared = GameAPIService()

    // Change this to your backend URL
    private let baseURL = "http://localhost:8080/api"

    @Published var isConnected = false
    @Published var currentStoryChunk = ""
    @Published var fullStory = ""

    private var streamTask: URLSessionDataTask?
    private var cancellables = Set<AnyCancellable>()

    private init() {}

    // MARK: - Room Management

    func createRoom(storyline: String = "hoop_dreams") async throws -> CreateRoomResponse {
        let url = URL(string: "\(baseURL)/rooms/create")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["storyline": storyline]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        return try JSONDecoder().decode(CreateRoomResponse.self, from: data)
    }

    func joinRoom(roomId: String, playerName: String) async throws -> JoinRoomResponse {
        let url = URL(string: "\(baseURL)/rooms/join")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let joinRequest = JoinRoomRequest(roomId: roomId, playerName: playerName)
        request.httpBody = try JSONEncoder().encode(joinRequest)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        return try JSONDecoder().decode(JoinRoomResponse.self, from: data)
    }

    func startGame(roomId: String) async throws {
        let url = URL(string: "\(baseURL)/rooms/\(roomId)/start")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
    }

    // MARK: - Streaming Story Response

    func streamStory(roomId: String, onChunk: @escaping (String) -> Void, onComplete: @escaping () -> Void) {
        let url = URL(string: "\(baseURL)/story/stream/\(roomId)")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 300 // 5 minutes for long stories

        let session = URLSession.shared
        streamTask = session.dataTask(with: request) { [weak self] data, response, error in
            if let error = error {
                print("Stream error: \(error.localizedDescription)")
                return
            }

            guard let data = data,
                  let text = String(data: data, encoding: .utf8) else {
                return
            }

            // Parse SSE format: "data: <content>\n\n"
            self?.parseSSEStream(text: text, onChunk: onChunk, onComplete: onComplete)
        }

        streamTask?.resume()
    }

    private func parseSSEStream(text: String, onChunk: @escaping (String) -> Void, onComplete: @escaping () -> Void) {
        let lines = text.components(separatedBy: "\n")

        for line in lines {
            if line.hasPrefix("data: ") {
                let content = String(line.dropFirst(6)) // Remove "data: "

                if content == "[DONE]" {
                    DispatchQueue.main.async {
                        onComplete()
                    }
                    return
                } else if content.hasPrefix("[ERROR]") {
                    print("Stream error: \(content)")
                    return
                } else {
                    DispatchQueue.main.async {
                        onChunk(content)
                    }
                }
            }
        }
    }

    func cancelStream() {
        streamTask?.cancel()
        streamTask = nil
    }

    // MARK: - Alternative: Async Stream (iOS 15+)

    func streamStoryAsync(roomId: String) -> AsyncStream<String> {
        return AsyncStream { continuation in
            let url = URL(string: "\(baseURL)/story/stream/\(roomId)")!
            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue("text/event-stream", forHTTPHeaderField: "Accept")

            let task = URLSession.shared.dataTask(with: request) { data, response, error in
                guard let data = data,
                      let text = String(data: data, encoding: .utf8) else {
                    continuation.finish()
                    return
                }

                let lines = text.components(separatedBy: "\n")
                for line in lines {
                    if line.hasPrefix("data: ") {
                        let content = String(line.dropFirst(6))
                        if content == "[DONE]" {
                            continuation.finish()
                            return
                        } else if !content.hasPrefix("[ERROR]") {
                            continuation.yield(content)
                        }
                    }
                }
            }

            task.resume()

            continuation.onTermination = { @Sendable _ in
                task.cancel()
            }
        }
    }
}
```

---

### Task 2.2: Create Game State Manager

**File**: `WhatsNextFront/WhatNext/WhatNext/ViewModels/GameViewModel.swift`

```swift
import Foundation
import Combine

@MainActor
class GameViewModel: ObservableObject {
    // Room state
    @Published var roomId: String = ""
    @Published var players: [String] = []
    @Published var currentTurn: Int = 0
    @Published var scores: [String: Int] = [:]

    // Story state
    @Published var currentStoryText: String = ""
    @Published var isStreaming: Bool = false
    @Published var storyHistory: [String] = []

    // Player state
    @Published var currentPlayerName: String = ""

    // Phase management
    @Published var gamePhase: GamePhase = .lobby

    private let apiService = GameAPIService.shared
    private var cancellables = Set<AnyCancellable>()

    enum GamePhase {
        case lobby
        case aiGenerating
        case playerInput
        case voting
        case gameOver
    }

    // MARK: - Room Actions

    func createRoom() async {
        do {
            let response = try await apiService.createRoom()
            self.roomId = response.roomId
            print("✅ Room created: \(response.roomId)")
        } catch {
            print("❌ Failed to create room: \(error)")
        }
    }

    func joinRoom(roomId: String, playerName: String) async {
        do {
            let response = try await apiService.joinRoom(roomId: roomId, playerName: playerName)
            self.roomId = response.roomId
            self.players = response.players
            self.currentPlayerName = playerName
            print("✅ Joined room: \(response.roomId)")
        } catch {
            print("❌ Failed to join room: \(error)")
        }
    }

    func startGame() async {
        do {
            try await apiService.startGame(roomId: roomId)
            self.gamePhase = .aiGenerating

            // Start streaming the opening story
            await streamOpening()
        } catch {
            print("❌ Failed to start game: \(error)")
        }
    }

    // MARK: - Story Streaming

    func streamOpening() async {
        isStreaming = true
        currentStoryText = ""

        // Option 1: Callback-based streaming
        apiService.streamStory(roomId: roomId) { [weak self] chunk in
            self?.currentStoryText += chunk + " "
        } onComplete: { [weak self] in
            guard let self = self else { return }
            Task { @MainActor in
                self.isStreaming = false
                self.storyHistory.append(self.currentStoryText)
                self.gamePhase = .playerInput
                print("✅ Story streaming complete")
            }
        }

        // Option 2: AsyncStream (cleaner for SwiftUI)
        // for await chunk in apiService.streamStoryAsync(roomId: roomId) {
        //     currentStoryText += chunk + " "
        // }
        // isStreaming = false
        // storyHistory.append(currentStoryText)
        // gamePhase = .playerInput
    }

    func cancelStreaming() {
        apiService.cancelStream()
        isStreaming = false
    }
}
```

---

### Task 2.3: Update GameView with Streaming Display

**File**: `WhatsNextFront/WhatNext/WhatNext/GamePage/GameView.swift`

```swift
import SwiftUI

struct GameView: View {
    @StateObject private var viewModel = GameViewModel()
    @State private var showStreamingIndicator = false

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [Color.red, Color.orange]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                // Title
                VStack(spacing: -30) {
                    Text("THE NBA")
                        .font(.system(size: 60))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)

                    Text("JOURNEY")
                        .font(.system(size: 60))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.black)
                }
                .padding(.horizontal, 30)

                // Story Display Area
                ScrollView {
                    ScrollViewReader { scrollProxy in
                        VStack(alignment: .leading, spacing: 10) {
                            // Streaming story text
                            Text(viewModel.currentStoryText)
                                .font(.system(size: 22))
                                .fontWeight(.medium)
                                .foregroundStyle(Color.white)
                                .padding(25)
                                .id("storyText")
                                .onChange(of: viewModel.currentStoryText) { _ in
                                    // Auto-scroll to bottom as text streams in
                                    withAnimation {
                                        scrollProxy.scrollTo("storyText", anchor: .bottom)
                                    }
                                }

                            // Streaming indicator
                            if viewModel.isStreaming {
                                HStack(spacing: 8) {
                                    ForEach(0..<3) { index in
                                        Circle()
                                            .fill(Color.white.opacity(0.7))
                                            .frame(width: 10, height: 10)
                                            .scaleEffect(showStreamingIndicator ? 1.0 : 0.5)
                                            .animation(
                                                Animation.easeInOut(duration: 0.6)
                                                    .repeatForever()
                                                    .delay(Double(index) * 0.2),
                                                value: showStreamingIndicator
                                            )
                                    }
                                    Text("AI is writing...")
                                        .font(.system(size: 16))
                                        .foregroundStyle(Color.white.opacity(0.8))
                                }
                                .padding(.leading, 25)
                                .onAppear {
                                    showStreamingIndicator = true
                                }
                            }
                        }
                    }
                }
                .frame(maxHeight: 400)

                // Player icons
                HStack {
                    ForEach(viewModel.players, id: \.self) { player in
                        VStack {
                            Image(systemName: "person.fill")
                                .resizable()
                                .frame(width: 50, height: 50)
                                .foregroundColor(.white)

                            Text(player.prefix(1))
                                .font(.system(size: 25))
                                .fontWeight(.bold)
                                .foregroundStyle(Color.white)

                            // Score display
                            Text("\(viewModel.scores[player] ?? 0) pts")
                                .font(.system(size: 14))
                                .foregroundStyle(Color.white.opacity(0.8))
                        }
                    }
                }
                .padding(.horizontal, 30)

                Spacer()
            }
        }
        .navigationBarHidden(true)
        .task {
            // When view appears, start streaming story
            await viewModel.streamOpening()
        }
    }
}

#Preview {
    GameView()
}
```

---

### Task 2.4: Update Lobby to Create Room on Start

**File**: `WhatsNextFront/WhatNext/WhatNext/Lobby.swift`

```swift
import SwiftUI

struct Lobby: View {
    @StateObject private var viewModel = GameViewModel()
    @State private var playerName = ""
    @State private var navigateToGame = false
    @State private var isCreatingRoom = false

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color.red, Color.orange]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                Text("ROOM ID:")
                    .font(.system(size: 60))
                    .fontWeight(.heavy)
                    .foregroundStyle(Color.black)
                    .padding(.horizontal, 30)
                    .padding(.bottom, -30)

                Text(viewModel.roomId.isEmpty ? "..." : viewModel.roomId)
                    .font(.system(size: 60))
                    .fontWeight(.heavy)
                    .foregroundStyle(Color.white)
                    .padding(.bottom, 50)

                // Player name input
                if viewModel.currentPlayerName.isEmpty {
                    TextField("Your Name", text: $playerName)
                        .font(.system(size: 24))
                        .padding()
                        .background(Color.white.opacity(0.9))
                        .cornerRadius(10)
                        .padding(.horizontal, 40)
                }

                // Players grid
                LazyVGrid(columns: [
                    GridItem(.fixed(100)),
                    GridItem(.fixed(100))
                ], spacing: 20) {
                    ForEach(viewModel.players, id: \.self) { player in
                        VStack {
                            Image(systemName: "person.fill")
                                .resizable()
                                .frame(width: 50, height: 50)
                                .foregroundColor(.white)
                            Text(player)
                                .font(.system(size: 20))
                                .fontWeight(.bold)
                                .foregroundStyle(Color.white)
                        }
                    }
                }

                // Start button
                Button(action: {
                    Task {
                        if viewModel.roomId.isEmpty {
                            isCreatingRoom = true
                            await viewModel.createRoom()
                            await viewModel.joinRoom(roomId: viewModel.roomId, playerName: playerName)
                            isCreatingRoom = false
                        }

                        if viewModel.players.count >= 2 {
                            await viewModel.startGame()
                            navigateToGame = true
                        }
                    }
                }) {
                    Text(isCreatingRoom ? "CREATING..." : "START")
                        .font(.system(size: 45))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(lineWidth: 7)
                                .foregroundColor(Color.black)
                                .background(Color.black)
                        )
                }
                .padding(30)
                .disabled(playerName.isEmpty || viewModel.players.count < 2)
            }

            NavigationLink(
                destination: GameView(),
                isActive: $navigateToGame
            ) {
                EmptyView()
            }
        }
        .task {
            // Auto-create room when lobby loads
            if viewModel.roomId.isEmpty {
                await viewModel.createRoom()
            }
        }
    }
}

#Preview {
    Lobby()
}
```

---

## Part 3: Testing & Debugging

### Task 3.1: Test Backend Streaming Endpoint

**Using curl**:
```bash
# Test health check
curl http://localhost:8080/health

# Test simple stream
curl -N http://localhost:8080/test/stream

# Create room
curl -X POST http://localhost:8080/api/rooms/create \
  -H "Content-Type: application/json" \
  -d '{"storyline": "hoop_dreams"}'

# Stream story (replace ROOM_ID)
curl -N http://localhost:8080/api/story/stream/ROOM_ID
```

**Expected output**:
```
data: You
data: step
data: onto
data: the
data: court.
data: [DONE]
```

### Task 3.2: Test iOS Network Layer

Add test function to `GameAPIService`:

```swift
func testConnection() async -> Bool {
    let url = URL(string: "\(baseURL.replacingOccurrences(of: "/api", with: ""))/health")!

    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        return json?["status"] as? String == "healthy"
    } catch {
        print("Connection test failed: \(error)")
        return false
    }
}
```

Call in Lobby's `.task`:
```swift
.task {
    let connected = await GameAPIService.shared.testConnection()
    print(connected ? "✅ Backend connected" : "❌ Backend not reachable")
}
```

### Task 3.3: Debug Checklist

**Backend Issues:**
- [ ] Virtual environment activated?
- [ ] `google-adk` installed?
- [ ] `.env` file configured with API key?
- [ ] Server running on correct port (8080)?
- [ ] CORS headers present in response?
- [ ] Check logs: `python api_server.py` output

**Frontend Issues:**
- [ ] Correct backend URL in `GameAPIService` (`localhost` works in simulator)
- [ ] Info.plist allows local connections: Add `App Transport Security Settings > Allow Arbitrary Loads > YES`
- [ ] Check Xcode console for network errors
- [ ] Use Network Link Conditioner to simulate slow streaming

**SSE Streaming Issues:**
- [ ] Response has `Content-Type: text/event-stream`
- [ ] Each message formatted as `data: <text>\n\n`
- [ ] Connection stays open (not closing prematurely)
- [ ] URLSession timeout sufficient (300s recommended)

---

## Part 4: Advanced Enhancements

### Task 4.1: Add Reconnection Logic

In `GameAPIService`:
```swift
func streamStoryWithRetry(roomId: String, maxRetries: Int = 3, onChunk: @escaping (String) -> Void, onComplete: @escaping () -> Void) {
    var retryCount = 0

    func attemptStream() {
        streamStory(roomId: roomId, onChunk: onChunk) {
            onComplete()
        }

        // If stream fails, retry
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            if retryCount < maxRetries && !self.isConnected {
                retryCount += 1
                print("Retrying stream... (\(retryCount)/\(maxRetries))")
                attemptStream()
            }
        }
    }

    attemptStream()
}
```

### Task 4.2: Add Typing Indicator Animation

```swift
struct TypingIndicator: View {
    @State private var animate = false

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(Color.white)
                    .frame(width: 8, height: 8)
                    .offset(y: animate ? -10 : 0)
                    .animation(
                        Animation.easeInOut(duration: 0.5)
                            .repeatForever()
                            .delay(Double(index) * 0.15),
                        value: animate
                    )
            }
        }
        .onAppear { animate = true }
    }
}
```

### Task 4.3: Add Response Caching

Store streamed stories locally:
```swift
func cacheStory(roomId: String, turn: Int, content: String) {
    let key = "\(roomId)_turn\(turn)"
    UserDefaults.standard.set(content, forKey: key)
}

func getCachedStory(roomId: String, turn: Int) -> String? {
    let key = "\(roomId)_turn\(turn)"
    return UserDefaults.standard.string(forKey: key)
}
```

---

## Part 5: Production Considerations

### Security
- [ ] Add authentication (JWT tokens for API access)
- [ ] Validate room IDs server-side
- [ ] Rate limit API endpoints
- [ ] Use HTTPS in production
- [ ] Sanitize player inputs before sending to ADK

### Scalability
- [ ] Replace in-memory storage with Redis/PostgreSQL
- [ ] Deploy backend to Cloud Run or Vertex AI Agent Engine
- [ ] Add load balancer for multiple backend instances
- [ ] Implement session persistence across server restarts

### Error Handling
- [ ] Handle network timeouts gracefully
- [ ] Show user-friendly error messages
- [ ] Add retry logic with exponential backoff
- [ ] Log errors to monitoring service (Sentry, Firebase)

### Performance
- [ ] Implement response caching
- [ ] Add compression for story content
- [ ] Optimize ADK prompts for faster generation
- [ ] Use iOS background URLSession for streaming

---

## Success Criteria

✅ **Backend Running**: Server starts without errors, health check returns 200
✅ **Room Creation**: iOS app can create room and receive room ID
✅ **Story Streaming**: Text appears word-by-word in iOS app in real-time
✅ **Smooth Animation**: No UI lag during streaming
✅ **Error Recovery**: App handles disconnections gracefully
✅ **Multi-device**: Multiple iOS devices can join same room

---

## Timeline Estimate

- **Part 1 (Backend)**: 4-6 hours
- **Part 2 (iOS)**: 6-8 hours
- **Part 3 (Testing)**: 2-3 hours
- **Part 4 (Enhancements)**: 3-4 hours

**Total**: ~2-3 days for full integration

---

## Questions to Resolve

1. **ADK Streaming API**: Confirm exact method for streaming responses from Google ADK
2. **Session Persistence**: How long should ADK sessions remain active?
3. **Multiplayer Sync**: Use polling or WebSockets for player state synchronization?
4. **Story Format**: Should AI return plain text or structured JSON with choices?
5. **Error Messages**: What happens if AI generation fails mid-stream?

---

## References

- Google ADK Docs: https://google.github.io/adk-docs/
- FastAPI: https://fastapi.tiangolo.com/
- Server-Sent Events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Swift Concurrency: https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html
- URLSession Streaming: https://developer.apple.com/documentation/foundation/urlsession
