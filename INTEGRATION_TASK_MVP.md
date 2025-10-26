# MVP Integration Task: Stream AI Responses to Frontend

**Goal**: Press "Start Game" button → Backend generates story with ADK → Stream text word-by-word to iOS

**Time Estimate**: 2-4 hours

---

## Part 1: Backend - Simple Streaming Endpoint


## Part 2: iOS - Display Streaming Text

### Step 2.1: Create Network Service

**File**: `WhatsNextFront/WhatNext/WhatNext/Services/StreamingService.swift`

Create new Swift file in Xcode (File → New → File → Swift File)

```swift
import Foundation

class StreamingService: ObservableObject {
    @Published var streamedText: String = ""
    @Published var isStreaming: Bool = false

    private var dataTask: URLSessionDataTask?

    // Change to your Mac's IP if testing on real device
    // Find with: ifconfig | grep "inet "
    private let baseURL = "http://localhost:8080"

    func startStreaming() {
        streamedText = ""
        isStreaming = true

        guard let url = URL(string: "\(baseURL)/stream") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 120

        dataTask = URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self,
                  let data = data,
                  let text = String(data: data, encoding: .utf8) else {
                DispatchQueue.main.async {
                    self?.isStreaming = false
                }
                return
            }

            self.parseSSE(text: text)
        }

        dataTask?.resume()
    }

    private func parseSSE(text: String) {
        let lines = text.components(separatedBy: "\n")

        for line in lines {
            if line.hasPrefix("data: ") {
                let content = String(line.dropFirst(6))

                if content == "[DONE]" {
                    DispatchQueue.main.async {
                        self.isStreaming = false
                    }
                } else if content == "[ERROR]" {
                    print("Stream error")
                    DispatchQueue.main.async {
                        self.isStreaming = false
                    }
                } else {
                    DispatchQueue.main.async {
                        self.streamedText += content + " "
                    }
                }
            }
        }
    }

    func stopStreaming() {
        dataTask?.cancel()
        isStreaming = false
    }
}
```

### Step 2.2: Update GameView to Use Streaming

**File**: `WhatsNextFront/WhatNext/WhatNext/GamePage/GameView.swift`

Replace existing GameView with:

```swift
import SwiftUI

struct GameView: View {
    @StateObject private var streamingService = StreamingService()
    @State private var hasStarted = false

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
                Text("WHAT NEXT")
                    .font(.system(size: 60))
                    .fontWeight(.heavy)
                    .foregroundStyle(Color.white)
                    .padding(.top, 50)

                // Story Display
                ScrollView {
                    Text(streamingService.streamedText.isEmpty ? "Press start to begin your journey..." : streamingService.streamedText)
                        .font(.system(size: 24))
                        .fontWeight(.medium)
                        .foregroundStyle(Color.white)
                        .padding(25)
                        .multilineTextAlignment(.leading)
                }
                .frame(maxHeight: 400)

                // Streaming indicator
                if streamingService.isStreaming {
                    HStack(spacing: 8) {
                        ForEach(0..<3) { index in
                            Circle()
                                .fill(Color.white)
                                .frame(width: 10, height: 10)
                                .scaleEffect(streamingService.isStreaming ? 1.0 : 0.5)
                                .animation(
                                    Animation.easeInOut(duration: 0.6)
                                        .repeatForever()
                                        .delay(Double(index) * 0.2),
                                    value: streamingService.isStreaming
                                )
                        }
                        Text("AI is writing...")
                            .font(.system(size: 18))
                            .foregroundStyle(Color.white.opacity(0.9))
                    }
                }

                Spacer()

                // Start/Stop Button
                Button(action: {
                    if streamingService.isStreaming {
                        streamingService.stopStreaming()
                    } else {
                        streamingService.startStreaming()
                        hasStarted = true
                    }
                }) {
                    Text(streamingService.isStreaming ? "STOP" : (hasStarted ? "START AGAIN" : "START GAME"))
                        .font(.system(size: 40))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 40)
                        .padding(.vertical, 15)
                        .background(
                            RoundedRectangle(cornerRadius: 15)
                                .fill(Color.black)
                        )
                }
                .padding(.bottom, 50)
            }
        }
        .navigationBarHidden(true)
    }
}

#Preview {
    GameView()
}
```

### Step 2.3: Allow Local Network Connections

In Xcode, find `Info.plist` and add:

1. Right-click Info.plist → Open As → Source Code
2. Add before the final `</dict>`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

Or in Xcode's Info tab:
- Add row → "App Transport Security Settings"
- Add child → "Allow Arbitrary Loads" → YES

---

## Part 3: Test the Integration

### Step 3.1: Start Backend

```bash
cd backend
source .venv/bin/activate
python api_server.py
```

Should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8080
```

### Step 3.2: Run iOS App

1. Open Xcode project
2. Select iPhone simulator
3. Press Run (⌘R)
4. Navigate to GameView
5. Press "START GAME"
6. Watch text stream in word by word!

---

## Troubleshooting

### Backend Not Starting
- Check virtual environment: `which python` should point to `.venv/bin/python`
- Install dependencies: `pip install fastapi uvicorn`
- Check `.env` file exists in `backend/whats_next_agent/` with API key

### "Connection Refused" Error
- Make sure backend is running: `curl http://localhost:8080/`
- Check port 8080 isn't being used: `lsof -i :8080`
- Try different port: Change 8080 to 8081 in both files

### No Text Appearing
- Check Xcode console for errors
- Verify Info.plist allows arbitrary loads
- Test backend directly: `curl -N http://localhost:8080/stream`
- Add print statements in `parseSSE` to debug

### Testing on Real iPhone (not simulator)
1. Find your Mac's IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Example: `192.168.1.5`

2. Update `StreamingService.swift`:
   ```swift
   private let baseURL = "http://192.168.1.5:8080"  // Use your IP
   ```

3. Make sure iPhone and Mac are on same WiFi network

---

## What You'll See

1. Press "START GAME" button
2. "AI is writing..." indicator appears with animated dots
3. Text appears word-by-word in real-time
4. After ~30 seconds, streaming completes
5. "START AGAIN" button appears to generate new story

---

## Next Steps (After MVP Works)

Once streaming is working, you can add:
- Multiple player inputs
- Voting system
- Room management
- Turn tracking
- Score keeping

But first, get this basic streaming working end-to-end!

---

## Quick Reference

**Backend URL**: `http://localhost:8080`
**Stream Endpoint**: `GET /stream`
**Start Backend**: `cd backend && source .venv/bin/activate && python api_server.py`
**iOS Entry Point**: `GameView.swift` → Press "START GAME"

---

## Expected Timeline

- **Backend Setup**: 30 minutes
- **iOS Setup**: 45 minutes
- **Testing & Debugging**: 30-60 minutes

**Total**: 2-3 hours for working MVP

---

## Success Criteria

✅ Backend starts without errors
✅ Curl test shows streaming text
✅ iOS app connects to backend
✅ Text appears word-by-word in iOS app
✅ Smooth animation during streaming
✅ "AI is writing..." indicator shows while streaming

Done! You have a working streaming AI story generator.
