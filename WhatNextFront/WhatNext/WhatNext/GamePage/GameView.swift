//
//  GameView.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct GameView: View {
    @EnvironmentObject var gameState: GameStateManager
    @State private var navigateToPrompt = false
    
    var body: some View {
        ZStack{
                //Color.indigo.ignoresSafeArea()
                LinearGradient(
                    gradient: Gradient(colors: [Color.red, Color.orange]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 20) {
                    Text("HOOP")
                        .font(.system(size: 60))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .padding(.bottom, -50)
                    Text("DREAMS")
                        .font(.system(size: 60))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.black)
                        .padding(.horizontal, 30)
                    
                    
                    ScrollView {
                        Text(gameState.parsedStoryText)
                            .font(.system(size: 25))
                            .fontWeight(.bold)
                            .padding(25)
                            .foregroundStyle(Color.white)
                            .multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    
                    // Show NEXT button if the AI gave a prompt, OR if we missed the jump and need a manual trigger
                    if !gameState.parsedDecisionPrompt.isEmpty && !gameState.sseManager.isStreaming {
                        Button(action: {
                            navigateToPrompt = true
                        }) {
                            Text("NEXT")
                                .font(.system(size: 30))
                                .fontWeight(.heavy)
                                .foregroundStyle(Color.white)
                                .padding(.horizontal, 30)
                                .background(
                                    RoundedRectangle(cornerRadius: 15)
                                        .foregroundColor(Color.black)
                                )
                                .frame(maxWidth: .infinity)
                        }
                    } else if gameState.sseManager.isStreaming {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(1.5)
                            .padding()
                    }
                    
                    Spacer()
                    
                    HStack{
                        ForEach(gameState.players, id: \.self) { player in
                            VStack{
                                if let index = gameState.players.firstIndex(of: player) {
                                    let score = gameState.scores[player] ?? 0
                                    
                                    Text("\(score)")
                                        .font(.system(size: 20))
                                        .fontWeight(.heavy)
                                        .foregroundStyle(Color.white)
                                }
                                
                                Image(systemName: "person.fill")
                                    .resizable()
                                    .frame(width: 50, height: 50)
                                Text(player.prefix(1))
                                    .font(.system(size: 25))
                                    .fontWeight(.bold)
                                    .foregroundStyle(Color.white)
                            }
                        }
                    
                }
                }
            }
        // Auto navigate or programmatic navigate to prompt when ready
        .navigationDestination(isPresented: $navigateToPrompt) {
            PromptScreen()
        }
        .onChange(of: gameState.currentPhase) { newPhase in
            if newPhase == .playerInput {
                navigateToPrompt = true
            }
        }
    }
}

#Preview {
    NavigationView {
        GameView()
            .environmentObject(GameStateManager())
    }
}
