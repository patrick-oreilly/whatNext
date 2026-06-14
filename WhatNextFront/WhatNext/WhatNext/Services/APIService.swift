import Foundation

enum APIError: Error {
    case invalidURL
    case networkError(Error)
    case invalidResponse
    case decodingError(Error)
    case serverError(String)
}

class APIService {
    static let shared = APIService()
    
    // Configurable base URL
    var baseURL: String = "http://localhost:8080/api"
    
    private let urlSession: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    private init() {
        self.urlSession = URLSession.shared
        
        self.decoder = JSONDecoder()
        // Backend uses snake_case, Swift uses camelCase
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        // Handle ISO8601 dates from the backend
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        
        self.decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateStr = try container.decode(String.self)
            
            if let date = formatter.date(from: dateStr) {
                return date
            }
            
            // Try standard ISO8601 if the microsecond format fails
            let isoFormatter = ISO8601DateFormatter()
            if let date = isoFormatter.date(from: dateStr) {
                return date
            }
            
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid date format: \(dateStr)")
        }
        
        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
    }
    
    // MARK: - Generic Request Helper
    
    private func performRequest<T: Codable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil
    ) async throws -> T {
        guard let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let body = body {
            request.httpBody = body
        }
        
        let (data, response) = try await urlSession.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        // Check for success status codes
        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.serverError("HTTP status code: \(httpResponse.statusCode)")
            }
        }
        
        do {
            let decodedResponse = try decoder.decode(T.self, from: data)
            return decodedResponse
        } catch {
            print("🚨 Decoding Error for \(endpoint): \(error)")
            if let str = String(data: data, encoding: .utf8) {
                print("Raw response: \(str)")
            }
            throw APIError.decodingError(error)
        }
    }
    
    // MARK: - Room Management Endpoints
    
    func createRoom(storyline: StorylineType, maxTurns: Int = 10) async throws -> RoomCreatedResponse {
        let requestBody = ["storyline": storyline.rawValue, "max_turns": maxTurns] as [String : Any]
        let data = try JSONSerialization.data(withJSONObject: requestBody)
        
        return try await performRequest(endpoint: "/rooms/create", method: "POST", body: data)
    }
    
    func joinRoom(roomId: String, playerName: String) async throws -> JoinRoomResponse {
        let requestBody = ["room_id": roomId, "player_name": playerName]
        let data = try JSONSerialization.data(withJSONObject: requestBody)
        
        return try await performRequest(endpoint: "/rooms/join", method: "POST", body: data)
    }
    
    func startGame(roomId: String) async throws -> RoomStateResponse {
        let requestBody = ["room_id": roomId]
        let data = try JSONSerialization.data(withJSONObject: requestBody)
        
        return try await performRequest(endpoint: "/rooms/\(roomId)/start", method: "POST", body: data)
    }
    
    func getRoomState(roomId: String) async throws -> RoomState {
        return try await performRequest(endpoint: "/rooms/\(roomId)/state", method: "GET")
    }
    
    // MARK: - Gameplay Endpoints
    
    func submitInput(roomId: String, playerName: String, inputText: String) async throws -> RoomStateResponse {
        let requestBody = [
            "room_id": roomId,
            "player_name": playerName,
            "input_text": inputText
        ]
        let data = try JSONSerialization.data(withJSONObject: requestBody)
        
        return try await performRequest(endpoint: "/input/submit", method: "POST", body: data)
    }
    
    func castVote(roomId: String, voter: String, chosenPlayer: String) async throws -> RoomStateResponse {
        let requestBody = [
            "room_id": roomId,
            "voter": voter,
            "chosen_player": chosenPlayer
        ]
        let data = try JSONSerialization.data(withJSONObject: requestBody)
        
        return try await performRequest(endpoint: "/voting/cast", method: "POST", body: data)
    }
    
    func advanceTurn(roomId: String) async throws -> RoomStateResponse {
        return try await performRequest(endpoint: "/turn/advance/\(roomId)", method: "POST")
    }
    
}
