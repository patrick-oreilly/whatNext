//
//  VoteScreen.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct VoteScreen: View {
    @ObservedObject var viewModel: GameViewModel
    @State private var selectedPrompt = ""
    
    var body: some View {
        let prompts = ["Dress up as a Hot-Dog and ruin the Draft", "Give Adam Silver a kiss on his cheek", "Release a swarm of locust upon the Draft"]
        
            ZStack{
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
                    
                    Text("It's draft night, what should he choose to do?")
                        .font(.system(size: 25))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .padding(.vertical,  -20)
                    
                    ScrollView(){
                        VStack(spacing: 20){
                            Spacer()
                            ForEach(prompts, id: \.self) { prompt in
                                Button {
                                    selectedPrompt = selectedPrompt == prompt ? "" : prompt
                                } label: {
                                    Text(prompt)
                                        .font(.system(size: 25))
                                        .fontWeight(.heavy)
                                        .foregroundStyle(Color.black)
                                        .frame(maxWidth: 275)
                                        .padding(.horizontal, 40)
                                        .padding(.vertical, selectedPrompt == prompt ? 20 : 10)
                                        .background(
                                            RoundedRectangle(cornerRadius: 15)
                                                .foregroundColor(selectedPrompt == prompt || selectedPrompt == "" ? Color.white :Color.white.opacity(0.5))
                                        )
                                }
                            }
                        }
                    }
                    
                    NavigationLink(destination: GameView()){
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
                    .disabled(selectedPrompt == "")
                    .opacity(selectedPrompt == "" ? 0.5 : 1.0)
                                        
                    HStack{
                        ForEach(viewModel.players, id: \.self) { player in
                            VStack{
                                if (viewModel.players.firstIndex(of: player) ?? 0) % 2 == 0 {
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
    }

}

#Preview {
    VoteScreen(viewModel: GameViewModel())
}
