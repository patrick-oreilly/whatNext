//
//  PromptScreen.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct PromptScreen: View {
    @EnvironmentObject var gameState: GameStateManager
    @State private var localPromptData: String = ""
    @State private var navigateToVote = false
    @State private var hasSubmitted = false
    
    var body: some View {
            ZStack{
                //Color.indigo.ignoresSafeArea()
                LinearGradient(
                    gradient: Gradient(colors: [Color.red, Color.orange]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack (spacing: 30){
                    Spacer()
                    
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
                    
                    
                    Text(gameState.parsedDecisionPrompt)
                        .font(.system(size: 25))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .multilineTextAlignment(.center)
                    
                    if hasSubmitted {
                        Text("Waiting for others...")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding()
                    } else {
                        TextField("Enter prompt here...", text: $localPromptData)
                            .font(.system(size: 20, weight: .bold))
                            .padding()
                            .background(Color.white.opacity(0.75))
                            .cornerRadius(10)
                            .padding(.horizontal)
                            .padding(.bottom, -15)
                    }
                    
                    Button(action: {
                        Task {
                            await gameState.submitIdea(text: localPromptData)
                            hasSubmitted = true
                        }
                    }) {
                        if gameState.isLoading && !hasSubmitted {
                            ProgressView().scaleEffect(1.5).padding()
                        } else {
                            Text("SUBMIT")
                                .font(.system(size: 30))
                                .fontWeight(.heavy)
                                .foregroundStyle(Color.white)
                                .padding(.vertical, 5)
                                .padding(.horizontal, 30)
                                .background(
                                    RoundedRectangle(cornerRadius: 15)
                                        .foregroundColor(Color.black)
                                )
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(localPromptData.isEmpty || hasSubmitted || gameState.isLoading)
                    .opacity(localPromptData.isEmpty || hasSubmitted ? 0.5 : 1.0)
                    .padding(30)
                    
                    Spacer()
                    
                    HStack {
                        ForEach(gameState.players, id: \.self) { player in
                            VStack {
                                // Check if this player has submitted by finding them in currentSubmissions
                                let hasPlayerSubmitted = gameState.currentSubmissions.contains(where: { $0.playerName == player })
                                
                                if hasPlayerSubmitted {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.black)
                                        .fontWeight(.heavy)
                                        .frame(height: 15)
                                        .frame(width: 50)
                                } else {
                                    Color.clear
                                        .frame(height: 15)
                                        .frame(width: 50)
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
        // Auto navigate or programmatic navigate to vote screen when ready
        .navigationDestination(isPresented: $navigateToVote) {
             VoteScreen()
        }
        .onChange(of: gameState.currentPhase) { _, newPhase in
            if newPhase == .voting {
                navigateToVote = true
            }
        }
    }
}

#Preview {
    NavigationView {
        PromptScreen()
            .environmentObject(GameStateManager())
    }
}
