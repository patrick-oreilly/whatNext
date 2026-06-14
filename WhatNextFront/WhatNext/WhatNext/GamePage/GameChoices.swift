//
//  GameChoices.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 29/10/2025.
//

import SwiftUI

struct GameChoices: View {
    @EnvironmentObject var gameState: GameStateManager
    @State private var playerName = ""
    @State private var selectedStoryline: StorylineType? = nil
    @State private var navigateToLobby = false

    // Pairs each on-screen theme label with the backend StorylineType it maps to.
    private struct StorylineOption: Identifiable {
        let id = UUID()
        let title: [String]
        let type: StorylineType
    }

    private let storylines: [StorylineOption] = [
        StorylineOption(title: ["HOOP", "DREAMS"], type: .hoopDreams),
        StorylineOption(title: ["CASINO", "HEIST"], type: .casinoHeist),
        StorylineOption(title: ["ALIEN", "LIFE"], type: .spaceExploration),
        StorylineOption(title: ["HAUNTED", "MANSION"], type: .hauntedMansion),
        StorylineOption(title: ["JACK", "MCBRINN"], type: .sunflowerWest),
        StorylineOption(title: ["CUSTOM", "STORY"], type: .customStoryline),
    ]

    var body: some View {
        ZStack{
            //Color.indigo.ignoresSafeArea()
            LinearGradient(
                gradient: Gradient(colors: [Color.red, Color.orange]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 10) {
                HStack(spacing: -65){
                    VStack(spacing: 20) {
                        Text("WHAT")
                            .font(.system(size: 60))
                            .fontWeight(.heavy)
                            .foregroundStyle(Color.white)
                            .padding(.horizontal, 30)
                            .padding(.bottom, -50)
                        Text("NEXT")
                            .font(.system(size: 60))
                            .fontWeight(.heavy)
                            .foregroundStyle(Color.black)
                            .padding(.horizontal, 30)
                    }
                    Text("?")
                        .font(.system(size: 125))
                        .fontWeight(.heavy)
                        .fontWidth(.condensed)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                }
                .padding(.bottom, -20)

                ScrollView{
                    Text("YOUR NAME:")
                        .font(.system(size: 30))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .padding(.bottom, -10)

                    TextField("Enter your name...", text: $playerName)
                                .font(.system(size: 30, weight: .bold))
                                .padding()
                                .frame(width: 325)
                                .background(Color.white.opacity(0.5))
                                .cornerRadius(10)
                                .padding(.horizontal)
                                .padding(.bottom, 10)
                                .autocorrectionDisabled()

                    Text("SELECT GAMEMODE:")
                        .font(.system(size: 30))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .padding(.bottom, -10)

                    VStack(spacing: 20){
                        ForEach(storylines) { option in
                            Button {
                                selectedStoryline = selectedStoryline == option.type ? nil : option.type
                            } label: {
                                VStack(){
                                    Text(option.title[0])
                                        .font(.system(size: 50))
                                        .fontWeight(.heavy)
                                        .foregroundStyle(selectedStoryline == option.type ? Color.black : Color.white)
                                        .padding(.horizontal, 30)
                                        .padding(.bottom, -42)
                                    Text(option.title[1])
                                        .font(.system(size: 50))
                                        .fontWeight(.heavy)
                                        .foregroundStyle(Color.black)
                                        .padding(.horizontal, 30)
                                }
                                .background(
                                    RoundedRectangle(cornerRadius: 20)
                                        .foregroundColor(Color.white)
                                        .opacity(selectedStoryline == option.type ? 1 : 0.2)
                                        .frame(width: 325)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 15)
                                                .stroke(Color.white, lineWidth: 5))
                                )
                            }
                        }

                        // Create the room on the backend, then advance to the lobby.
                        Button(action: {
                            Task {
                                guard let storyline = selectedStoryline else { return }
                                do {
                                    try await gameState.createRoom(storyline: storyline, name: playerName)
                                    navigateToLobby = true
                                } catch {
                                    print("Create Room Error: \(error.localizedDescription)")
                                }
                            }
                        }) {
                            if gameState.isLoading {
                                ProgressView()
                                    .scaleEffect(1.5)
                                    .padding()
                            } else {
                                Text("NEXT")
                                    .font(.system(size: 40))
                                    .fontWeight(.heavy)
                                    .foregroundStyle(Color.white)
                                    .padding(.horizontal, 30)
                                    .background(
                                        RoundedRectangle(cornerRadius: 15)
                                            .foregroundColor(Color.black)
                                    )
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        .disabled(playerName.isEmpty || selectedStoryline == nil || gameState.isLoading)
                        .opacity(playerName.isEmpty || selectedStoryline == nil ? 0.5 : 1.0)

                        if let errorMessage = gameState.errorMessage {
                            Text(errorMessage)
                                .foregroundColor(.white)
                                .fontWeight(.bold)
                                .padding()
                                .background(Color.black.opacity(0.6))
                                .cornerRadius(10)
                        }
                    }
                }
            }
        }
        // Navigation triggered programmatically once the room is created
        .navigationDestination(isPresented: $navigateToLobby) {
            Lobby()
        }
    }

}

#Preview {
    NavigationStack {
        GameChoices()
            .environmentObject(GameStateManager())
    }
}
