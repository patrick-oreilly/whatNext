//
//  ContentView.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct ContentView: View {
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
                    
                    NavigationLink(destination: Lobby()){
                        Text("START GAME")
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
                                    
                    NavigationLink(destination: FindGame()){
                        Text("FIND GAME")
                            .font(.system(size: 30))
                            .fontWeight(.heavy)
                            .foregroundStyle(Color.white)
                            .padding(.horizontal, 30)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(lineWidth: 7)
                                    .foregroundColor(Color.black)
                                    .background(Color.black)
                                    .frame(minWidth: 250)
                            )
                    }
                    
                    
                }
            }
            
        }
    }
}

#Preview {
    ContentView()
}
