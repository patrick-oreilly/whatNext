//
//  Lobby.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct Lobby: View {
    let players = ["Patrick", "Aedan", "Eoin", "Dad", "Mom"]
    @State private var value: Double = 10
    @State private var isExpanded = false

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
                    
                    Text("121 232")
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
                        ForEach(players, id: \.self) { player in
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
                    
                    // Start button
                    NavigationLink(destination: GameView()) {
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
                    .padding(50)
                }
            }
        }
    }
}

#Preview {
    Lobby()
}
