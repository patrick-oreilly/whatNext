package io.github.patrickoreilly.whatnext.mobile.viewmodel

import dev.johnoreilly.whatnext.mobile.network.RoomState
import dev.johnoreilly.whatnext.mobile.network.StartGameResponse
import dev.johnoreilly.whatnext.mobile.repository.WhatNextRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class LobbyUiState(
    val players: List<String> = emptyList(),
    val isHost: Boolean = false,
    val canStartGame: Boolean = false,
    val isStarting: Boolean = false,
    val error: String? = null,
)

sealed class LobbyEvent {
    data class NavigateToGame(val roomId: String = "") : LobbyEvent()
    data class NavigateToGameOver(val roomId: String = "") : LobbyEvent()
    data class ShowError(val message: String) : LobbyEvent()
}

class LobbyViewModel(
    private val playerName: String,
    private val playerToken: String? = null,
    private val startGame: suspend (roomId: String, playerToken: String?) -> StartGameResponse = { r, t ->
        WhatNextRepository().startGame(r, t)
    },
) {
    private val _uiState = MutableStateFlow(LobbyUiState())
    val uiState: StateFlow<LobbyUiState> = _uiState.asStateFlow()

    private val _navigationEvent = MutableSharedFlow<LobbyEvent>(replay = 1, extraBufferCapacity = 1)
    val navigationEvent: SharedFlow<LobbyEvent> = _navigationEvent

    fun updateRoomState(state: RoomState) {
        val isHost = state.players.firstOrNull() == playerName
        val canStart = isHost && state.players.size >= 2

        _uiState.update {
            it.copy(
                players = state.players,
                isHost = isHost,
                canStartGame = canStart,
            )
        }

        when (state.phase) {
            "player_input", "voting", "generating_story" -> {
                _navigationEvent.tryEmit(LobbyEvent.NavigateToGame(state.roomId))
            }
            "game_over" -> {
                _navigationEvent.tryEmit(LobbyEvent.NavigateToGameOver(state.roomId))
            }
        }
    }

    suspend fun startGame(roomId: String) {
        _uiState.update { it.copy(isStarting = true, error = null) }
        try {
            startGame(roomId, playerToken)
            _navigationEvent.emit(LobbyEvent.NavigateToGame(roomId))
        } catch (e: Exception) {
            _navigationEvent.emit(LobbyEvent.ShowError(e.message ?: "Failed to start game"))
        } finally {
            _uiState.update { it.copy(isStarting = false) }
        }
    }
}
