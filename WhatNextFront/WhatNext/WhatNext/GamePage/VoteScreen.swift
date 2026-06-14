//
//  VoteScreen.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct VoteScreen: View {
    @EnvironmentObject var gameState: GameStateManager
    @State private var selectedPlayerName = ""
    @State private var navigateToGame = false
    @State private var hasVoted = false
    
    var body: some View {
        ZStack {
            //Color.indigo.ignoresSafeArea()
            LinearGradient(
                gradient: Gradient(colors: [Color.red, Color.orange]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack (spacing: 30){
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
                        .padding(.vertical,  -20)
                        .multilineTextAlignment(.center)
                    
                    if hasVoted {
                        Text("Waiting for others to finish voting...")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding()
                    } else {
                        ScrollView(){
                            VStack(spacing: 20){
                                Spacer()
                                ForEach(gameState.currentSubmissions.filter { $0.playerName != gameState.playerName }, id: \.id) { submission in
                                    Button {
                                        selectedPlayerName = selectedPlayerName == submission.playerName ? "" : submission.playerName
                                    } label: {
                                        Text(submission.text)
                                            .font(.system(size: 20)) // Slightly smaller to fit varied inputs
                                            .fontWeight(.bold)
                                            .foregroundStyle(Color.black)
                                            .frame(maxWidth: 300)
                                            .padding(.horizontal, 20)
                                            .padding(.vertical, selectedPlayerName == submission.playerName ? 20 : 10)
                                            .background(
                                                RoundedRectangle(cornerRadius: 15)
                                                    .foregroundColor(selectedPlayerName == submission.playerName || selectedPlayerName == "" ? Color.white :Color.white.opacity(0.5))
                                            )
                                    }
                                }
                            }
                        }
                    }
                    
                    Button(action: {
                        Task {
                            await gameState.castVote(for: selectedPlayerName)
                            hasVoted = true
                        }
                    }) {
                        if gameState.isLoading && !hasVoted {
                            ProgressView().scaleEffect(1.5).padding()
                        } else {
                            Text("CONFIRM")
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
                    .disabled(selectedPlayerName.isEmpty || hasVoted || gameState.isLoading)
                    .opacity(selectedPlayerName.isEmpty || hasVoted ? 0.5 : 1.0)
                                        
                    HStack{
                        ForEach(gameState.players, id: \.self) { player in
                            VStack{
                                // Show checkmark if player has voted
                                // (Requires logic on backend to know who voted. Using current turn/phase as proxy for now)
                                let playerHasVoted = gameState.currentSubmissions.contains(where: { input in
                                    input.voters.contains(player)
                                })
                                
                                if playerHasVoted {
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
            
        } // End ZStack
        // Navigate back to game view when story starts generating again
        .navigationDestination(isPresented: $navigateToGame) {
             GameView()
        }
        .onChange(of: gameState.currentPhase) { newPhase in
            if newPhase == .generatingStory {
                navigateToGame = true
            }
        }
    }
}

#Preview {
    NavigationView {
        VoteScreen()
            .environmentObject(GameStateManager())
    }
}
