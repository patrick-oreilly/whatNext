//
//  PromptScreen.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct PromptScreen: View {
    @State private var prompt = ""
    let players = ["Patrick", "Aedan", "Eoin", "Dad", "Mom"]
    
    var body: some View {
        NavigationView {
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
                    
                    HStack(spacing: -60){
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
                            .foregroundStyle(Color.white)
                            .padding(.horizontal, 30)
                    }
                    
                    
                    Text("It's draft night, what should he choose to do?")
                        .font(.system(size: 25))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        
                    
                    TextField("Enter prompt here...", text: $prompt)
                        .font(.system(size: 20, weight: .bold))
                        .padding()
                        .background(Color.white.opacity(0.75))
                        .cornerRadius(10)
                        .padding(.horizontal)
                        .padding(.bottom, -15)
                    
                    NavigationLink(destination: GameView()){
                        Text("SUBMIT")
                            .font(.system(size: 30))
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
                    
                    Spacer()
                    
                    HStack{
                        ForEach(players, id: \.self) { player in
                            VStack{
                                if (players.firstIndex(of: player) ?? 0) % 2 == 1 {
                                        Image(systemName: "checkmark")
                                            .foregroundColor(.black)
                                            .fontWeight(.heavy)
                                            .frame(height: 15)
                                            .frame(width: 50)
                                    } else {
                                        // Empty space so layout stays consistent
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
        }
    }
}

#Preview {
    PromptScreen()
}
