# iOS Frontend Guide - What's Next Game

This guide explains how to build an iOS app that connects to the What's Next game backend.

**Backend Server:** `http://localhost:8000`

---

## File Structure

Here's the recommended file structure for your iOS app:

```
WhatNextApp/
├── Models/
│   ├── GamePhase.swift          - Tracks which stage of the game you're in
│   ├── StorylineType.swift      - The different story themes available
│   ├── RoomState.swift          - All the game room information
│   └── PlayerInput.swift        - Player submissions and votes
│
├── Services/
│   ├── APIService.swift         - Talks to the backend server
│   └── SSEStreamManager.swift   - Receives real-time story updates
│
├── Utilities/
│   └── StoryParser.swift        - Separates story text from game instructions
│
├── ViewModels/
│   └── GameStateManager.swift   - Keeps track of everything happening in the game
│
└── Views/
    ├── LobbyView.swift          - Waiting room before game starts
    ├── GameView.swift           - Main game screen
    ├── StoryDisplayView.swift   - Shows the story as it's being written
    ├── InputView.swift          - Where players type their ideas
    └── VotingView.swift         - Vote on which idea to use
```

---

## What Each Component Does

### 1. Models (Data Structures)

**GamePhase.swift** - Knows what's happening right now
- `lobby` - Waiting for players to join
- `generating_story` - AI is writing the next part of the story
- `player_input` - Players are submitting their ideas
- `voting` - Players are voting on which idea they like best
- `game_over` - Story is finished

**StorylineType.swift** - The story theme
- `hoop_dreams` - Basketball story
- `space_exploration` - Space adventure
- `casino_heist` - Casino heist thriller
- `haunted_mansion` - Spooky mystery

**RoomState.swift** - Everything about the current game
- Who's playing
- Everyone's scores
- Which turn you're on
- The entire story so far
- All the player submissions

**PlayerInput.swift** - What each player submitted
- The player's name
- What they wrote
- How many votes they got
- Who voted for them

### 2. Services (Talking to the Backend)

**APIService.swift** - Handles all communication with the server
- Creates a new game room
- Joins an existing game
- Starts the game
- Gets the current game state
- Submits a player's story idea
- Casts votes
- Advances to the next turn

**SSEStreamManager.swift** - Receives the story as it's being written
- Opens a live connection to the server
- Receives text chunks in real-time (like watching someone type)
- Knows when the AI is done writing

### 3. Utilities (Helper Tools)

**StoryParser.swift** - Cleans up the AI's response

The AI sends back text that looks like this:
```
You dribble down the court. The crowd is roaring.
You see an opening to the basket.

[DECISION] What do you do next?

Status: Age 15, Score 100
```

The StoryParser separates this into three parts:
1. **Story text**: "You dribble down the court. The crowd is roaring. You see an opening to the basket."
2. **Decision prompt**: "What do you do next?"
3. **Status info**: "Age 15, Score 100"

This way you can display each part differently in your UI.

### 4. ViewModels (The Brain)

**GameStateManager.swift** - Keeps track of everything
- Current story text
- What decision the player needs to make
- Current status (age, score, etc.)
- All players in the game
- Current game phase
- Automatically updates the UI when anything changes

This uses SwiftUI's `@Published` properties so your views automatically refresh when the game state changes.

### 5. Views (What the User Sees)

**LobbyView.swift** - The waiting room
- Shows who has joined
- Shows the room code
- "Start Game" button for the host

**GameView.swift** - The main game screen
- Shows the story as it unfolds
- Shows the decision prompt
- Shows the current status
- Changes based on what phase the game is in

**StoryDisplayView.swift** - The story text area
- Displays the clean story text (without [DECISION] markers)
- Auto-scrolls as new text arrives
- Shows a typewriter effect as the AI writes

**InputView.swift** - Where players contribute
- Text field for typing story ideas
- Submit button
- Shows if you've already submitted

**VotingView.swift** - Vote on submissions
- Lists all player submissions
- Shows vote buttons
- Highlights which one you voted for

---

## How the Game Flows

1. **Start in Lobby**
   - Players join using a room code
   - Host picks a story theme
   - Host clicks "Start Game"

2. **AI Generates Opening**
   - Game switches to `generating_story` phase
   - Your app connects to the story stream
   - Text appears word-by-word on screen
   - StoryParser extracts the decision prompt

3. **Players Submit Ideas**
   - Game switches to `player_input` phase
   - Each player types what happens next
   - Hit submit to send to server

4. **Players Vote**
   - Game switches to `voting` phase
   - See everyone's submissions (anonymous)
   - Vote for your favorite

5. **Winner Chosen & Continue**
   - Winning idea is selected
   - Game advances to next turn
   - Back to step 2 (AI continues the story)

6. **Game Ends**
   - After max turns, game switches to `game_over`
   - Final scores are shown

---

## Key Technical Details

### Polling (Checking for Updates)
Your app should regularly check the server for updates:
- In lobby: Check every 2 seconds (to see when new players join)
- During game: Check every 3 seconds (to see phase changes)

### Story Streaming
When the AI is generating a story, use SSE (Server-Sent Events) to receive text in real-time. This gives a nice typewriter effect.

### JSON Conversion
The backend uses Python naming (snake_case), but Swift uses camelCase. Configure your JSON decoder to automatically convert:
```swift
decoder.keyDecodingStrategy = .convertFromSnakeCase
```

### Thread Safety
All UI updates must happen on the main thread. Mark your GameStateManager with `@MainActor` to handle this automatically.

---

## Implementation Checklist

1. Create all the model structs
2. Build the APIService with all the endpoint functions
3. Build the SSEStreamManager for real-time streaming
4. Create the StoryParser utility
5. Build the GameStateManager
6. Build each SwiftUI view
7. Add polling timer to GameStateManager
8. Test the complete flow

**Estimated Time:** 2-3 weeks for a complete implementation

---

## Backend API Quick Reference

**Creating/Joining:**
- POST `/api/rooms/create` - Create a new game
- POST `/api/rooms/join` - Join existing game
- POST `/api/rooms/{id}/start` - Start the game

**During Game:**
- GET `/api/rooms/{id}/state` - Get current state
- POST `/api/input/submit` - Submit your idea
- POST `/api/voting/cast` - Vote for an idea
- POST `/api/turn/advance/{id}` - Move to next turn

**Real-time:**
- GET `/api/story/stream/{id}` - Stream story updates (SSE)

**Cleanup:**
- DELETE `/api/rooms/{id}` - Delete game room
