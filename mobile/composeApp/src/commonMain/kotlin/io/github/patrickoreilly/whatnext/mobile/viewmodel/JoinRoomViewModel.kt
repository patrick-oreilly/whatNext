package io.github.patrickoreilly.whatnext.mobile.viewmodel

import dev.johnoreilly.whatnext.mobile.network.JoinRoomResponse
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class JoinRoomUiState(
    val playerName: String = "",
    val roomCode: String = "",
    val isLoading: Boolean = false,
    val playerNameError: String? = null,
    val roomCodeError: String? = null,
)

sealed class JoinRoomEvent {
    data class NavigateToLobby(val roomId: String) : JoinRoomEvent()
}

class JoinRoomViewModel(
    private val joinRoom: suspend (roomId: String, playerName: String) -> JoinRoomResponse,
    private val onCredentialsStored: ((token: String, name: String, room: String) -> Unit)? = null,
) {
    private val _uiState = MutableStateFlow(JoinRoomUiState())
    val uiState: StateFlow<JoinRoomUiState> = _uiState.asStateFlow()

    private val _navigationEvent = MutableSharedFlow<JoinRoomEvent>(replay = 1)
    val navigationEvent: SharedFlow<JoinRoomEvent> = _navigationEvent.asSharedFlow()

    var playerName: String
        get() = _uiState.value.playerName
        set(value) {
            _uiState.update { it.copy(playerName = value, playerNameError = null) }
        }

    var roomCode: String
        get() = _uiState.value.roomCode
        set(value) {
            _uiState.update { it.copy(roomCode = value, roomCodeError = null) }
        }

    suspend fun join() {
        val state = _uiState.value
        val trimmedName = state.playerName.trim()
        val trimmedCode = state.roomCode.trim()

        val nameError = if (trimmedName.isBlank()) "Name cannot be blank" else null
        val codeError = if (trimmedCode.length != 6) "Room code must be 6 characters" else null

        if (nameError != null || codeError != null) {
            _uiState.update {
                it.copy(playerNameError = nameError, roomCodeError = codeError)
            }
            return
        }

        _uiState.update {
            it.copy(isLoading = true, playerNameError = null, roomCodeError = null)
        }

        try {
            val response = joinRoom(trimmedCode, trimmedName)
            onCredentialsStored?.invoke(response.playerToken, trimmedName, response.roomId)
            _navigationEvent.emit(JoinRoomEvent.NavigateToLobby(response.roomId))
            _uiState.update { it.copy(isLoading = false) }
        } catch (e: Exception) {
            val message = e.message ?: "Unknown error"
            val (nameErr, codeErr) = handleJoinError(message)
            _uiState.update {
                it.copy(isLoading = false, playerNameError = nameErr, roomCodeError = codeErr)
            }
        }
    }

    private fun handleJoinError(message: String): Pair<String?, String?> {
        return when {
            message.contains("already taken") -> message to null
            message.contains("not found") || message.contains("does not exist") ->
                null to "Room not found. Please check the code."
            message.contains("full") -> null to "Room is full. Cannot join."
            message.contains("started") || message.contains("game already") ->
                null to "Game has already started. Cannot join."
            else -> null to message
        }
    }
}
