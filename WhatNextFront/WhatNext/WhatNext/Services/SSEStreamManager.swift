import Foundation

class SSEStreamManager: NSObject, ObservableObject {
    private var task: URLSessionDataTask?
    private var session: URLSession?
    
    var baseURL: String = "http://localhost:8080/api"
    
    @Published var currentText: String = ""
    @Published var isStreaming: Bool = false
    
    var onComplete: (() -> Void)?
    var onError: ((Error) -> Void)?
    
    func connect(roomId: String) {
        disconnect()
        
        guard let url = URL(string: "\(baseURL)/story/stream/\(roomId)") else { return }
        
        var request = URLRequest(url: url)
        request.timeoutInterval = 300 // Long timeout for SSE
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        
        // Setup session config
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 300
        config.timeoutIntervalForResource = 300
        
        session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
        
        task = session?.dataTask(with: request)
        
        DispatchQueue.main.async {
            self.currentText = ""
            self.isStreaming = true
        }
        
        task?.resume()
        print("🌍 SSE Stream Connected for room: \(roomId)")
    }
    
    func disconnect() {
        task?.cancel()
        session?.invalidateAndCancel()
        task = nil
        session = nil
        
        DispatchQueue.main.async {
            self.isStreaming = false
        }
        print("🌍 SSE Stream Disconnected")
    }
}

extension SSEStreamManager: URLSessionDataDelegate {
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard let string = String(data: data, encoding: .utf8) else { return }
        
        let lines = string.components(separatedBy: "\n")
        var newText = ""
        
        for line in lines {
            if line.hasPrefix("data: ") {
                let textResult = line.dropFirst(6)
                
                // Handle special Server Sent Event markers from Gemini/Backend
                if textResult == "[DONE]" {
                    DispatchQueue.main.async {
                        self.isStreaming = false
                        self.onComplete?()
                    }
                    disconnect()
                    return
                }
                
                // Append the chunks together
                newText += textResult
            }
        }
        
        guard !newText.isEmpty else { return }
        
        // Clean up common SSE escaping like JSON strings (if backend sends JSON inside SSE)
        let cleanedText = newText.replacingOccurrences(of: "\\n", with: "\n")
                                 .replacingOccurrences(of: "\\\"", with: "\"")
        
        DispatchQueue.main.async {
            self.currentText += cleanedText
        }
    }
    
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        DispatchQueue.main.async {
            self.isStreaming = false
        }
        
        if let error = error {
            // Ignore cancel errors as they are expected when we disconnect
            if (error as NSError).code != NSURLErrorCancelled {
                print("🚨 SSE Stream Error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.onError?(error)
                }
            }
        }
    }
}
