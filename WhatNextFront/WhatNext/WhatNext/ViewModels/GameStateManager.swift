import Foundation
import Combine
import SwiftUI

@MainActor
class GameStateManager: ObservableObject {
    
    @Published var roomId: String = ""
    @Published var playerName: String = ""
    @Published var isHost: Bool = false
    
    // Published Gamestate properties for UI
    @Published var currentPhase: GamePhase = .lobby
    @Published var players: [String] = []
    @Published var storyHistory: [StorySegment] = []
    @Published var currentSubmissions: [PlayerInput] = []
    @Published var activeStoryline: StorylineType = .customStoryline
    @Published var currentTurn: Int = 0
    @Published var scores: [String: Int] = [:]
    
    // UI Loading & error states
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    
    // Extracted components
    @Published var parsedStoryText: String = ""
    @Published var parsedDecisionPrompt: String = ""
    @Published var parsedStatus: String = ""
    
    // Polling State
    private var pollTimer: AnyCancellable?
    private var isPolling: Bool = false
    
    let api = APIService.shared
    let sseManager = SSEStreamManager()
    
    init() {
        // Automatically inject streamed chunks into the parsed story text when generating
        sseManager.$currentText
            .receive(on: RunLoop.main)
            .assign(to: &$parsedStoryText)
    }
    
    // MARK: - Room Management API
    
    func createRoom(storyline: StorylineType, name: String) async throws {
        isLoading = true
        defer { isLoading = false }

        do {
            let response = try await api.createRoom(storyline: storyline)
            self.roomId = response.roomId
            self.activeStoryline = storyline
            self.isHost = true

            // Auto-join the creator
            try await joinGame(roomId: self.roomId, name: name)
        } catch {
            errorMessage = error.localizedDescription
            throw error // Re-throw so the view can gate navigation
        }
    }
    
    func joinGame(roomId: String, name: String) async throws {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let cleanedRoomId = roomId.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
            let response = try await api.joinRoom(roomId: cleanedRoomId, playerName: name)
            
            self.roomId = response.roomId
            self.playerName = name
            self.players = response.players
            
            // Start listening for state changes
            startPolling()
            
        } catch {
            errorMessage = error.localizedDescription
            throw error // Re-throw to caller to stop navigation
        }
    }
    
    func startGame() async {
        guard isHost else { return }
        isLoading = true
        
        do {
            let state = try await api.startGame(roomId: roomId)
            updateLocalState(with: state)
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }
    
    // MARK: - Polling & Real-time Integration
    
    func startPolling() {
        guard !isPolling, !roomId.isEmpty else { return }
        isPolling = true
        
        // Poll every 2.5 seconds
        pollTimer = Timer.publish(every: 2.5, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                Task {
                    await self?.fetchState()
                }
            }
    }
    
    func stopPolling() {
        pollTimer?.cancel()
        pollTimer = nil
        isPolling = false
    }
    
    private func fetchState() async {
        // Prevent polling overlap if SSE is actively playing
        guard !sseManager.isStreaming else { return }
        
        do {
            let newState = try await api.getRoomState(roomId: roomId)
            updateLocalState(with: newState)
        } catch {
            print("Poll failed: \(error)")
        }
    }
    
    private func updateLocalState(with state: RoomState) {
        // Determine phase transitions
        let phaseChanged = self.currentPhase != state.phase
        
        self.currentPhase = state.phase
        self.players = state.players
        self.storyHistory = state.storyHistory
        self.currentSubmissions = state.playerInputs
        self.activeStoryline = state.storyline
        self.currentTurn = state.turn
        self.scores = state.scores
        
        // Parse history to get the latest segment
        if let latestSegment = state.storyHistory.last {
            if !sseManager.isStreaming {
                self.parsedStoryText = latestSegment.content.paragraph
            }
            self.parsedDecisionPrompt = latestSegment.content.decision ?? ""
            self.parsedStatus = latestSegment.content.status ?? ""
        }
        
        // Handle trigger events based on phase shift
        if phaseChanged {
            handlePhaseTransition(to: state.phase)
        }
    }
    
    private func handlePhaseTransition(to newPhase: GamePhase) {
        switch newPhase {
        case .generatingStory:
            // The backend is creating the story. We start streaming the raw SSE to screen.
            sseManager.connect(roomId: roomId)
            
            // Re-check state naturally once the SSE completes
            sseManager.onComplete = { [weak self] in
                guard let self = self else { return }
                Task { await self.fetchState() }
            }
            
        case .playerInput:
            // Ensure connection dropped
            sseManager.disconnect()
            
        default:
            break
        }
    }
    
    // MARK: - Gameplay Action Methods
    
    func submitIdea(text: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let state = try await api.submitInput(roomId: roomId, playerName: playerName, inputText: text)
            updateLocalState(with: state)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    func castVote(for chosenPlayerName: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            let state = try await api.castVote(roomId: roomId, voter: playerName, chosenPlayer: chosenPlayerName)
            updateLocalState(with: state)

            // If voting finishes after this vote, the phase transitions.
            // The polling loop handles the UI update to the winner.
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// True once every player has cast a vote in the current voting round.
    /// Drives the host-only "NEXT TURN" button so the round can be advanced.
    var allPlayersVoted: Bool {
        guard currentPhase == .voting, !players.isEmpty else { return false }
        let voters = Set(currentSubmissions.flatMap { $0.voters })
        return players.allSatisfy { voters.contains($0) }
    }

    func advanceTurn() async {
        guard isHost else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let result = try await api.advanceTurn(roomId: roomId)

            if result.status == "game_over" {
                // Final turn reached — clean phase transition (full results screen TBD).
                self.currentPhase = .gameOver
                stopPolling()
            } else {
                // The advance endpoint returns a status payload, not full room state,
                // so refresh explicitly; this flips phase to generating_story and the
                // existing handlePhaseTransition reconnects the SSE stream.
                let state = try await api.getRoomState(roomId: roomId)
                updateLocalState(with: state)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
