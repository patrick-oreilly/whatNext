package io.github.patrickoreilly.whatnext.mobile.viewmodel

import dev.johnoreilly.whatnext.mobile.network.CreateRoomResponse
import dev.johnoreilly.whatnext.mobile.network.JoinRoomResponse
import dev.johnoreilly.whatnext.mobile.repository.WhatNextRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class StorylineOption(
    val id: String,
    val label: String,
    val description: String,
) {
    companion object {
        val defaults = listOf(
            StorylineOption("hoop_dreams", "Hoop Dreams", "Follow your journey from youth basketball to NBA stardom"),
            StorylineOption("space_exploration", "Space Exploration", "Explore the cosmos and encounter alien civilizations"),
            StorylineOption("casino_heist", "Casino Heist", "Plan and execute the perfect casino heist"),
            StorylineOption("haunted_mansion", "Haunted Mansion", "Uncover the secrets of a mysterious haunted mansion"),
            StorylineOption("sunflower_west", "Sunflower West", "Rise from sult gigs to music stardom as Galway icon Jack McBrinn"),
        )
    }
}

data class CreateRoomUiState(
    val playerName: String = "",
    val storylineOptions: List<StorylineOption> = StorylineOption.defaults,
    val selectedStoryline: StorylineOption? = null,
    val maxTurns: Int = 10,
    val isCreating: Boolean = false,
    val validationErrors: List<String> = emptyList(),
)

sealed class CreateRoomEvent {
    data class NavigateToLobby(val roomId: String) : CreateRoomEvent()
    data class ShowError(val message: String) : CreateRoomEvent()
    data object NavigateBack : CreateRoomEvent()
}

class CreateRoomViewModel(
    private val createRoom: suspend (storyline: String, maxTurns: Int) -> CreateRoomResponse = { s, t ->
        WhatNextRepository().createRoom(s, t)
    },
    private val joinRoom: suspend (roomId: String, playerName: String) -> JoinRoomResponse = { r, n ->
        WhatNextRepository().joinRoom(r, n)
    },
    private val onCredentialsStored: (token: String, name: String, room: String) -> Unit = { _, _, _ -> },
) {
    private val _uiState = MutableStateFlow(CreateRoomUiState())
    val uiState: StateFlow<CreateRoomUiState> = _uiState.asStateFlow()

    private val _navigationEvent = MutableSharedFlow<CreateRoomEvent>(replay = 1, extraBufferCapacity = 1)
    val navigationEvent: SharedFlow<CreateRoomEvent> = _navigationEvent

    fun setPlayerName(name: String) {
        _uiState.update { it.copy(playerName = name) }
    }

    fun setStoryline(id: String) {
        val option = _uiState.value.storylineOptions.find { it.id == id }
        if (option != null) {
            _uiState.update { it.copy(selectedStoryline = option) }
        }
    }

    fun setMaxTurns(turns: Int) {
        val clamped = turns.coerceIn(5, 20)
        _uiState.update { it.copy(maxTurns = clamped) }
    }

    suspend fun createAndJoin() {
        val state = _uiState.value
        val errors = mutableListOf<String>()

        val name = state.playerName.trim()
        if (name.isBlank()) {
            errors.add("Player name is required")
        } else if (name.length > 20) {
            errors.add("Name must be 20 characters or fewer")
        }
        if (state.selectedStoryline == null) {
            errors.add("Please select a storyline")
        }

        if (errors.isNotEmpty()) {
            _uiState.update { it.copy(validationErrors = errors) }
            return
        }

        _uiState.update { it.copy(isCreating = true, validationErrors = emptyList()) }

        try {
            val createResponse = createRoom(state.selectedStoryline!!.id, state.maxTurns)
            val joinResponse = joinRoom(createResponse.roomId, name)
            onCredentialsStored(joinResponse.playerToken, name, createResponse.roomId)
            _uiState.update { it.copy(isCreating = false) }
            _navigationEvent.emit(CreateRoomEvent.NavigateToLobby(createResponse.roomId))
        } catch (e: Exception) {
            _uiState.update { it.copy(isCreating = false) }
            _navigationEvent.emit(CreateRoomEvent.ShowError(e.message ?: "Failed to create room"))
        }
    }

    fun cancel() {
        _navigationEvent.tryEmit(CreateRoomEvent.NavigateBack)
    }
}
