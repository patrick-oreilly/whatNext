//
//  PromptScreen.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct PromptScreen: View {
    @ObservedObject var viewModel: GameViewModel
    
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
                    
                    
                    Text("It's draft night, what should he choose to do?")
                        .font(.system(size: 25))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                    
                    
                    TextField("Enter prompt here...", text: $viewModel.prompt)
                        .font(.system(size: 20, weight: .bold))
                        .padding()
                        .background(Color.white.opacity(0.75))
                        .cornerRadius(10)
                        .padding(.horizontal)
                        .padding(.bottom, -15)
                    
                    NavigationLink(destination: VoteScreen(viewModel: GameViewModel())){
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
                    .disabled(viewModel.prompt == "")
                    .opacity(viewModel.prompt != "" ? 1.0 : 0.5)
                    .padding(30)
                    
                    Spacer()
                    
                    HStack{
                        ForEach(viewModel.players, id: \.self) { player in
                            VStack{
                                if (viewModel.players.firstIndex(of: player) ?? 0) % 2 == 1 {
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

#Preview {
    PromptScreen(viewModel: GameViewModel())
}
