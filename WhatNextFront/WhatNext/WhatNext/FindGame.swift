//
//  FindGame.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct FindGame: View {
    @EnvironmentObject var gameState: GameStateManager
    @State private var playerName = ""
    @State private var roomCode = ""
    @State private var navigateToLobby = false
    
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
                    Text("YOUR NAME:")
                        .font(.system(size: 40))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .padding(.bottom, -10)
                    
                    TextField("Enter your name...", text: $playerName)
                                .font(.system(size: 25, weight: .bold))
                                .padding()
                                .frame(width: 300)
                                .background(Color.white.opacity(0.5))
                                .cornerRadius(10)
                                .padding(.horizontal)
                                .autocorrectionDisabled()
                    
                    Text("ROOM CODE:")
                        .font(.system(size: 40))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .padding(.bottom, -10)
                    
                    TextField("Enter 6-digit code...", text: $roomCode)
                                .font(.system(size: 25, weight: .bold))
                                .padding()
                                .frame(width: 300)
                                .background(Color.white.opacity(0.5))
                                .cornerRadius(10)
                                .padding(.horizontal)
                                .autocorrectionDisabled()
                                .onChange(of: roomCode) { newValue in
                                    roomCode = String(newValue.uppercased().prefix(6))
                                }
                    
//                    Text("ASK THE HOST FOR THE ROOM CODE")
//                        .font(.system(size: 18))
//                        .frame(width: 400)
//                        .fontWeight(.bold)
//                        .foregroundStyle(Color.white)
//                        .padding(.horizontal, 30)
                                        
                    Button(action: {
                        Task {
                            do {
                                try await gameState.joinGame(roomId: roomCode, name: playerName)
                                navigateToLobby = true
                            } catch {
                                print("Join Error: \(error.localizedDescription)")
                            }
                        }
                    }) {
                        VStack{
                            if gameState.isLoading {
                                ProgressView()
                                    .scaleEffect(1.5)
                                    .padding()
                            } else {
                                Text("JOIN")
                                    .font(.system(size: 45))
                                    .fontWeight(.heavy)
                                    .foregroundStyle(Color.black)
                                    .padding(.top, 5)
                                    .padding(.bottom, -35)
                                Text("ROOM")
                                    .font(.system(size: 45))
                                    .fontWeight(.heavy)
                                    .foregroundStyle(Color.black)
                                    .padding(.horizontal, 30)
                                    .padding(.bottom, 5)
                            }
                        }
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(lineWidth: 5)
                                .foregroundColor(.white)
                                .background(!playerName.isEmpty && roomCode.count == 6 ? .white : .white.opacity(0.5))
                        )
                        .frame(maxWidth: .infinity)
                    }
                    .disabled(playerName.isEmpty || roomCode.count != 6 || gameState.isLoading)
                    .padding(30)
                    // Navigation destination triggered programmatically after API succeeding
                    .navigationDestination(isPresented: $navigateToLobby) {
                        Lobby()
                    }
                    
                    if let errorMessage = gameState.errorMessage {
                        Text(errorMessage)
                            .foregroundColor(.white)
                            .fontWeight(.bold)
                            .padding()
                            .background(Color.black.opacity(0.6))
                            .cornerRadius(10)
                            .padding(.top, -10)
                    }
                    
                    Spacer()

                }
                
            }
        
    }
}

#Preview {
    NavigationView {
        FindGame()
            .environmentObject(GameStateManager())
    }
}
