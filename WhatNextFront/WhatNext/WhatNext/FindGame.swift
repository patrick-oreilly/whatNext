//
//  FindGame.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct FindGame: View {
    @State private var text = ""
    @State private var text2 = ""
    
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
                    
                    TextField("Enter your name...", text: $text)
                                .font(.system(size: 25, weight: .bold))
                                .padding()
                                .frame(width: 300)
                                .background(Color.white.opacity(0.5))
                                .cornerRadius(10)
                                .padding(.horizontal)
                    
                    Text("ROOM CODE:")
                        .font(.system(size: 40))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .padding(.bottom, -10)
                    
                    TextField("Enter 6-digit code...", text: $text2)
                                .font(.system(size: 25, weight: .bold))
                                .padding()
                                .frame(width: 300)
                                .background(Color.white.opacity(0.5))
                                .cornerRadius(10)
                                .padding(.horizontal)
                    
//                    Text("ASK THE HOST FOR THE ROOM CODE")
//                        .font(.system(size: 18))
//                        .frame(width: 400)
//                        .fontWeight(.bold)
//                        .foregroundStyle(Color.white)
//                        .padding(.horizontal, 30)
                                        
                    NavigationLink(destination: Lobby()){
                        VStack{
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
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(lineWidth: 5)
                                .foregroundColor(.white)
                                .background(text != "" && text2.count == 6 ? .white : .white.opacity(0.5))
                                
                            
                        )
                        .frame(maxWidth: .infinity)
                    }
                    .padding(30)
                    
                    Spacer()

                }
                
                //3 digit blocks
                
            }
        
    }
}

#Preview {
    FindGame()
}
