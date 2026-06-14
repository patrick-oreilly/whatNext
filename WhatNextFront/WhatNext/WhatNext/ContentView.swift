//
//  ContentView.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        
        NavigationStack {
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
                                .font(.system(size: 80))
                                .fontWeight(.heavy)
                                .foregroundStyle(Color.white)
                                .padding(.horizontal, 30)
                                .padding(.bottom, -60)
                            Text("NEXT")
                                .font(.system(size: 80))
                                .fontWeight(.heavy)
                                .foregroundStyle(Color.black)
                                .padding(.horizontal, 30)
                        }
                        Text("?")
                            .font(.system(size: 160))
                            .fontWeight(.heavy)
                            .fontWidth(.condensed)
                            .foregroundStyle(Color.white)
                            .padding(.horizontal, 30)
                    }
                    
                    NavigationLink(destination: GameChoices()){
                        Text("START GAME")
                            .font(.system(size: 40))
                            .fontWeight(.heavy)
                            .foregroundStyle(Color.white)
                            .padding(10)
                            .background(
                                RoundedRectangle(cornerRadius: 20)
                                    .foregroundColor(Color.black)
                                    .frame(width: 300)
                            )
                    }
                                    
                    NavigationLink(destination: FindGame()){
                        Text("FIND GAME")
                            .font(.system(size: 40))
                            .fontWeight(.heavy)
                            .foregroundStyle(Color.white)
                            .padding(10)
                            .background(
                                RoundedRectangle(cornerRadius: 20)
                                    .foregroundColor(Color.black)
                                    .frame(width: 300)
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
