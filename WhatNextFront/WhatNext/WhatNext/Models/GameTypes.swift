import Foundation

enum GamePhase: String, Codable {
    case lobby = "lobby"
    case generatingStory = "generating_story"
    case playerInput = "player_input"
    case voting = "voting"
    case gameOver = "game_over"
}

enum StorylineType: String, Codable {
    case hoopDreams = "hoop_dreams"
    case spaceExploration = "space_exploration"
    case casinoHeist = "casino_heist"
    case hauntedMansion = "haunted_mansion"
    case sunflowerWest = "sunflower_west"
    case customStoryline = "custom_storyline"
}
