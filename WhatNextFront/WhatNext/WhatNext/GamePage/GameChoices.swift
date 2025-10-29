//
//  GameChoices.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 29/10/2025.
//

import SwiftUI

struct GameChoices: View {
    let games = [["HOOP", "DREAMS"], ["CASINO", "HEIST"], ["ALIEN", "LIFE"], ["HAUNTED", "MANSION"], ["JACK", "MCBRINN"], ["CUSTOM", "STORY"]]
    @State private var selectedGame = ["", ""]
    @State private var text = ""
    
    var body: some View {
        ZStack{
            //Color.indigo.ignoresSafeArea()
            LinearGradient(
                gradient: Gradient(colors: [Color.red, Color.orange]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack(spacing: 10) {
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
                .padding(.bottom, -20)
                
                ScrollView{
                    Text("YOUR NAME:")
                        .font(.system(size: 30))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .padding(.bottom, -10)
                    
                    TextField("Enter your name...", text: $text)
                                .font(.system(size: 30, weight: .bold))
                                .padding()
                                .frame(width: 325)
                                .background(Color.white.opacity(0.5))
                                .cornerRadius(10)
                                .padding(.horizontal)
                                .padding(.bottom, 10)
                    
                    Text("SELECT GAMEMODE:")
                        .font(.system(size: 30))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .padding(.bottom, -10)
                    
                    VStack(spacing: 20){
                        ForEach(games, id: \.self) { game in
                            Button {
                                selectedGame = selectedGame == game ? ["", ""] : game
                            } label: {
                                VStack(){
                                    Text(game[0])
                                        .font(.system(size: 50))
                                        .fontWeight(.heavy)
                                        .foregroundStyle(selectedGame == game ? Color.black : Color.white)
                                        .padding(.horizontal, 30)
                                        .padding(.bottom, -42)
                                    Text(game[1])
                                        .font(.system(size: 50))
                                        .fontWeight(.heavy)
                                        .foregroundStyle(Color.black)
                                        .padding(.horizontal, 30)
                                }
                                .background(
                                    RoundedRectangle(cornerRadius: 20)
                                        .foregroundColor(Color.white)
                                        .opacity(selectedGame == game ? 1 : 0.2)
                                        .frame(width: 325)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 15)
                                                .stroke(Color.white, lineWidth: 5))
                                )
                            }
                        }
                        
                        NavigationLink(destination: Lobby()) {
                            Text("NEXT")
                                .font(.system(size: 40))
                                .fontWeight(.heavy)
                                .foregroundStyle(Color.white)
                                .padding(.horizontal, 30)
                                .background(
                                    RoundedRectangle(cornerRadius: 15)
                                        .foregroundColor(Color.black)
                                    
                                )
                                .frame(maxWidth: .infinity)
                        }
                        .disabled(selectedGame == ["",""])
                        .opacity(selectedGame == ["",""] ? 0.5 : 1.0)
                    }
                }
            }
        }
    }
    
}

#Preview {
    GameChoices()
}
