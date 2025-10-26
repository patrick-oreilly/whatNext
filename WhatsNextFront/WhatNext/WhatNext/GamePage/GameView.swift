//
//  GameView.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct GameView: View {
    var body: some View {
        let players = ["Patrick", "Aedan", "Eoin", "Dad", "Mom"]
        
        NavigationView {
            ZStack{
                //Color.indigo.ignoresSafeArea()
                LinearGradient(
                    gradient: Gradient(colors: [Color.red, Color.orange]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 20) {
                    Text("THE NBA")
                        .font(.system(size: 60))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .padding(.bottom, -50)
                    Text("JOURNEY")
                        .font(.system(size: 60))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.black)
                        .padding(.horizontal, 30)
                    
                    
                    ScrollView{
                        Text("A young Irish hooper bursts into the NBA spotlight, his crossover dazzling, his dreams colossal. Yet each night, he wrestles with legacy—should he chase rings, or retire early to honor his late father’s dream: devouring glory as a hotdog-eating champion? It's draft night, what should he choose to do?")
                            .font(.system(size: 25))
                            .fontWeight(.bold)
                            .padding(25)
                            .foregroundStyle(Color.white)
                    }
                    HStack{
                        ForEach(players, id: \.self) { player in
                            VStack{
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
}

#Preview {
    GameView()
}
