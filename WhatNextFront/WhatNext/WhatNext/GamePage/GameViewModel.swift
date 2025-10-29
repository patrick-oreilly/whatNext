//
//  GameViewModel.swift
//  WhatNext
//
//  Created by Eoin O’Reilly on 27/10/2025.
//

import Foundation
import SwiftUI // Required for ObservableObject

class GameViewModel: ObservableObject {
    @Published var players = ["Patrick", "Aedan", "Eoin", "Dad", "Mom"]
    @Published var prompt = "test"
    
    init() {
//        self.currentUser = user
//        self.displayName = user.name
//        self.isPremium = user.isProMember
    }
    
//    func fetchUserData() {
//
//    }
}
