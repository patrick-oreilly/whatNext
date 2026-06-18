package io.github.patrickoreilly.whatnext.mobile.navigation

import dev.johnoreilly.whatnext.mobile.network.RoomState
import io.github.patrickoreilly.whatnext.mobile.settings.CredentialStore

sealed class AutoRejoinResult {
    data class NavigateTo(val route: Route) : AutoRejoinResult()
    data class ShowHomeWithMessage(val message: String) : AutoRejoinResult()
    data object NoCredentials : AutoRejoinResult()
}

suspend fun resolveAutoRejoin(
    store: CredentialStore,
    fetchState: suspend (roomId: String) -> RoomState,
): AutoRejoinResult {
    val roomId = store.roomId
    val playerToken = store.playerToken

    if (roomId == null || playerToken == null) {
        return AutoRejoinResult.NoCredentials
    }

    return try {
        val state = fetchState(roomId)
        val route = when (state.phase) {
            "lobby" -> Route.Lobby(roomId)
            "game_over" -> Route.GameOver(roomId)
            else -> Route.Game(roomId)
        }
        AutoRejoinResult.NavigateTo(route)
    } catch (e: Exception) {
        store.clear()
        AutoRejoinResult.ShowHomeWithMessage("Your previous session ended. Welcome back!")
    }
}
