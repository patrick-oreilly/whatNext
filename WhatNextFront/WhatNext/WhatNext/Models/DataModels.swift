import Foundation

struct LlmOutput: Codable {
    let paragraph: String
    let status: String?
    let decision: String?
    let hasStoryEnded: Bool
    let endingSummary: String?
}

struct StorySegment: Codable {
    let turn: Int
    let content: LlmOutput
    let winningPlayer: String?
    let timestamp: Date
}

struct PlayerInput: Codable, Identifiable {
    var id: String { playerName } // Helper for SwiftUI lists
    let playerName: String
    let text: String
    let votes: Int
    let voters: [String]
    let timestamp: Date
}

struct RoomState: Codable {
    let roomId: String
    let storyline: StorylineType
    let players: [String]
    let scores: [String: Int]
    let turn: Int
    let phase: GamePhase
    let storyHistory: [StorySegment]
    let playerInputs: [PlayerInput]
    let maxTurns: Int
    let inputPhaseStartTime: Date?
    let votingPhaseStartTime: Date?
    let timedOutPlayers: [String]
    let storyHasEnded: Bool
    let votingTimeoutSeconds: Int?
}
