//
//  Lobby.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct Lobby: View {
    @EnvironmentObject var gameState: GameStateManager
    @State private var isExpanded = false
    @State private var navigateToGame = false

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color.red, Color.orange]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                Text("GAME")
                    .font(.system(size: 60))
                    .fontWeight(.heavy)
                    .foregroundStyle(Color.white)
                    .padding(.bottom, -50)

                Text("LOBBY")
                    .font(.system(size: 60))
                    .fontWeight(.heavy)
                    .foregroundStyle(Color.black)

                
                ScrollView{
                    Text("ROOM CODE:")
                        .font(.system(size: 30))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.bottom, -70)
                    
                    Text("\(gameState.roomId)")
                        .font(.system(size: 80))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.bottom, -10)
                    
                    Button {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                            isExpanded.toggle()
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 8) {
                            // Header row
                            HStack {
                                Text("GAME SETTINGS")
                                    .font(.system(size: 20))
                                    .fontWeight(.heavy)
                                    .foregroundColor(.black)
                                Spacer()
                                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                    .foregroundColor(.black)
                            }
                            
                            // Expanded content (now inside the button)
                            if isExpanded {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("PLOTLINE")
                                        .font(.system(size: 18))
                                        .fontWeight(.bold)
                                    Text("HOOP DREAMS")
                                        .font(.system(size: 18))
                                        .fontWeight(.regular)
                                    Text("NUMBER OF TURNS")
                                        .font(.system(size: 18))
                                        .fontWeight(.bold)
                                    Text("10")
                                        .font(.system(size: 18))
                                        .fontWeight(.regular)
                                    Text("PLAYERS")
                                        .font(.system(size: 18))
                                        .fontWeight(.bold)
                                    Text("5/10")
                                        .font(.system(size: 18))
                                        .fontWeight(.regular)
                                }
                                .padding(.top, 6)
                                .transition(.opacity.combined(with: .move(edge: .top)))
                            }
                        }
                        .padding()
                        .background(.white.opacity(0.85))
                        .cornerRadius(12)
                        .frame(width: 300)
                        .shadow(radius: 3)
                    }
                    .buttonStyle(.plain)
                    .padding(.bottom, 50)
                    
                    LazyVGrid(columns: [
                        GridItem(.fixed(100)),
                        GridItem(.fixed(100)),
                        GridItem(.fixed(100))
                    ], spacing: 20) {
                        ForEach(gameState.players, id: \.self) { player in
                            VStack {
                                Image(systemName: "person.fill")
                                    .resizable()
                                    .frame(width: 50, height: 50)
                                Text(player)
                                    .font(.system(size: 25))
                                    .fontWeight(.bold)
                                    .foregroundStyle(Color.white)
                            }
                        }
                    }
                    
                    // Start button - Only for Host
                    if gameState.isHost {
                        Button(action: {
                            Task {
                                await gameState.startGame()
                            }
                        }) {
                            if gameState.isLoading {
                                ProgressView().scaleEffect(1.5).padding()
                            } else {
                                Text("START")
                                    .font(.system(size: 45))
                                    .fontWeight(.heavy)
                                    .foregroundStyle(Color.white)
                                    .padding(.horizontal, 30)
                                    .background(
                                        RoundedRectangle(cornerRadius: 10)
                                            .stroke(lineWidth: 7)
                                            .foregroundColor(Color.black)
                                            .background(Color.black)
                                    )
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        .disabled(gameState.isLoading)
                        .padding(50)
                    } else {
                        Text("Waiting for host to start...")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(50)
                    }
                }
            }
        }
        // Auto-navigate when game moves from Lobby to Generating Story phase
        .onChange(of: gameState.currentPhase) { newPhase in
            if newPhase == .generatingStory {
                navigateToGame = true
            }
        }
        .navigationDestination(isPresented: $navigateToGame) {
            GameView()
        }
    }
}

#Preview {
    NavigationView {
        Lobby()
            .environmentObject(GameStateManager())
    }
}
