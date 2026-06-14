//
//  WhatNextApp.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

@main
struct WhatNextApp: App {
    @StateObject private var gameState = GameStateManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(gameState)
                #if os(macOS)
                .frame(width: 393, height: 852) // Approximate iPhone 15 Pro size
                #endif
        }
        #if os(macOS)
        .windowResizability(.contentSize)
        #endif
    }
}
