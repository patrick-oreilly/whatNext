//
//  Lobby.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct Lobby: View {
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
                    Text("ROOM ID:")
                        .font(.system(size: 60))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.black)
                        .padding(.horizontal, 30)
                        .padding(.bottom, -30)
                    
                    Text("121 232")
                        .font(.system(size: 60))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.bottom, 50)
                        .padding(.bottom, -30)
                    
                    
                    LazyVGrid(columns: [
                        GridItem(.fixed(100)),
                        GridItem(.fixed(100))
                    ], spacing: 20) {
                        ForEach(players, id: \.self) { player in
                            
                            VStack{
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
                    
                    NavigationLink(destination: GameView()){
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
                    .padding(30)
                    
//                    .background(
//                        RoundedRectangle(cornerRadius: 10)
//                            .stroke(lineWidth: 7)
//                            .frame(maxWidth: 250)
                    
                    
                }
            }
        }
    }
}

#Preview {
    Lobby()
}
