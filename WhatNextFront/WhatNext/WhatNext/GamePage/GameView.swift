//
//  GameView.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct GameView: View {
    var body: some View {
        @ObservedObject var viewModel = GameViewModel()
        
        let story = "A young Irish hooper bursts into the NBA spotlight, his crossover dazzling, his dreams colossal. Yet each night, he wrestles with legacy—should he chase rings, or retire early to honor his late father’s dream: devouring glory as a hotdog-eating champion? It's draft night, what should he choose to do?"
        
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
                    
                    
                    ScrollView{
                        Text(story)
                            .font(.system(size: 25))
                            .fontWeight(.bold)
                            .padding(25)
                            .foregroundStyle(Color.white)
                    }
                    
                    NavigationLink(destination: PromptScreen(viewModel: GameViewModel())) {
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
                    
                    Spacer()
                    
                    HStack{
                        ForEach(viewModel.players, id: \.self) { player in
                            VStack{
                                if let index = viewModel.players.firstIndex(of: player) {
                                    let score = index > 0 ? 200 / index : 200
                                    
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
    }
}

#Preview {
    GameView()
}
