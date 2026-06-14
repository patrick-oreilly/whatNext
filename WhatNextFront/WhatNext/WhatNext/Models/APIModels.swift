import Foundation

// API Response Models

struct RoomCreatedResponse: Codable {
    let roomId: String
    let storyline: String
    let status: String
}

struct JoinRoomResponse: Codable {
    let roomId: String
    let players: [String]
    let status: String
}

struct VotingResultsResponse: Codable {
    let roomId: String
    let winningPlayer: String
    let winningInput: String
    let voteCounts: [String: Int]
    let wasTie: Bool
    let tiedPlayers: [String]
}

struct ErrorResponse: Codable {
    let error: String
    let message: String
    let details: String?
}

// Response from POST /api/turn/advance/{room_id}. The endpoint returns a small
// status payload (not a full RoomState), and the shape varies by outcome
// (turn_advanced / game_over / noop), so every field beyond status is optional.
struct TurnAdvanceResponse: Codable {
    let status: String
    let turn: Int?
    let phase: GamePhase?
    let finalScores: [String: Int]?
}

struct HealthResponse: Codable {
    let status: String
    let apiConfigured: Bool
    let activeRooms: Int
    let timestamp: Date
}

typealias RoomStateResponse = RoomState
