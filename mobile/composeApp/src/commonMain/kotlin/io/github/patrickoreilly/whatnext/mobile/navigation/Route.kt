package io.github.patrickoreilly.whatnext.mobile.navigation

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
sealed class Route {
    @Serializable
    @SerialName("Home")
    data object Home : Route()

    @Serializable
    @SerialName("CreateRoom")
    data object CreateRoom : Route()

    @Serializable
    @SerialName("JoinRoom")
    data object JoinRoom : Route()

    @Serializable
    @SerialName("Lobby")
    data class Lobby(val roomId: String) : Route()

    @Serializable
    @SerialName("Game")
    data class Game(val roomId: String) : Route()

    @Serializable
    @SerialName("GameOver")
    data class GameOver(val roomId: String) : Route()
}
