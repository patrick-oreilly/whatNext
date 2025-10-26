//
//  FindGame.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 26/10/2025.
//

import SwiftUI

struct FindGame: View {
    @State private var text = ""
    
    var body: some View {
        NavigationView {
            ZStack{
                Color.indigo.ignoresSafeArea()
                
                VStack(spacing: 20) {
                    Text("Enter Room ID:")
                        .font(.system(size: 45))
                        .fontWeight(.heavy)
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 30)
                        .padding(.bottom, -10)
                    
                    TextField("XXX XXX...", text: $text)
                                .font(.system(size: 30, weight: .bold))
                                .padding()
                                .background(Color.white.opacity(0.5))
                                .cornerRadius(10)
                                .padding(.horizontal)
                }
                
                //3 digit blocks
                
            }
        }
    }
}

#Preview {
    FindGame()
}
