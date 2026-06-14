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

struct HealthResponse: Codable {
    let status: String
    let apiConfigured: Bool
    let activeRooms: Int
    let timestamp: Date
}

typealias RoomStateResponse = RoomState
