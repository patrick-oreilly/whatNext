//
//  VoteScreen.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct VoteScreen: View {
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
                    
                    Text("Dress up as a Hot-Dog and ruin the Draft")
                        .font(.system(size: 25))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.black)
                        .frame(maxWidth: 275)
                        .padding(.horizontal, 40)
                        .padding(.vertical, 5)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(lineWidth: 7)
                                .foregroundColor(Color.white)
                                .background(Color.white)
                                .padding(.horizontal)
                            
                        )
                    
                    Text("Give Adam Silver a kiss on his cheek")
                        .font(.system(size: 25))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.black)
                        .frame(maxWidth: 275)
                        .padding(.horizontal, 40)
                        .padding(.vertical, 5)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(lineWidth: 7)
                                .foregroundColor(Color.white)
                                .background(Color.white)
                                .padding(.horizontal)
                            
                        )
                    
                    Text("Release a swarm of locust upon the Draft")
                        .font(.system(size: 25))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.black)
                        .frame(maxWidth: 275)
                        .padding(.horizontal, 40)
                        .padding(.vertical, 5)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(lineWidth: 7)
                                .foregroundColor(Color.white)
                                .background(Color.white)
                                .padding(.horizontal)
                            
                        )
                    
                    Spacer()
                    
                    HStack{
                        ForEach(players, id: \.self) { player in
                            VStack{
                                if (players.firstIndex(of: player) ?? 0) % 2 == 0 {
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
    VoteScreen()
}
