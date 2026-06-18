package dev.johnoreilly.whatnext.mobile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.Button
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import dev.johnoreilly.whatnext.mobile.components.HeaderBar
import dev.johnoreilly.whatnext.mobile.components.JoinGameCard
import dev.johnoreilly.whatnext.mobile.components.Panel
import dev.johnoreilly.whatnext.mobile.components.InGameContent
import dev.johnoreilly.whatnext.mobile.components.GameOverContent
import dev.johnoreilly.whatnext.mobile.network.RoomState
import dev.johnoreilly.whatnext.mobile.repository.WhatNextRepository
import dev.johnoreilly.whatnext.mobile.ui.gametheme.GameTheme
import dev.johnoreilly.whatnext.mobile.ui.gametheme.LocalGameColors
import kotlinx.coroutines.launch
import org.jetbrains.compose.ui.tooling.preview.Preview

@Composable
@Preview
fun App() {
    GameTheme {
        val repository = remember { WhatNextRepository() }
        val gameColors = LocalGameColors.current

        // State for join + room state
        var playerName by remember { mutableStateOf("") }
        var roomCode by remember { mutableStateOf("") }
        var roomStateResult by remember { mutableStateOf<Result<RoomState>?>(null) }
        var joining by remember { mutableStateOf(false) }
        var refreshingRoomState by remember { mutableStateOf(false) }
        var joinError by remember { mutableStateOf<String?>(null) }
        var refreshError by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()
        val clipboardManager = LocalClipboardManager.current

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(gameColors.surfaceNearBlack)
                .verticalScroll(rememberScrollState())
                .systemBarsPadding()
                .padding(16.dp)
        ) {
            // Top-level content: join screen or room content
            when {
                joining -> {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator()
                        Spacer(Modifier.width(12.dp))
                        Text("Loading room…")
                    }
                }
                roomStateResult == null -> {
                    JoinGameCard(
                        name = playerName,
                        roomCode = roomCode,
                        onNameChange = { playerName = it },
                        onRoomCodeChange = { roomCode = it.uppercase() },
                        loading = joining,
                        error = joinError,
                        onCancel = {
                            playerName = ""
                            roomCode = ""
                            joinError = null
                        },
                        onJoin = {
                            val code = roomCode.trim()
                            val name = playerName.trim()
                            if (code.length != 6 || name.isBlank()) {
                                joinError = "Please enter your name and a 6-character room code."
                                return@JoinGameCard
                            }
                            scope.launch {
                                joining = true
                                joinError = null
                                roomStateResult = null
                                val result = runCatching { repository.joinRoom(code, name) }
                                if (result.isSuccess) {
                                    roomStateResult = runCatching { repository.getRoomState(code) }
                                } else {
                                    joinError = result.exceptionOrNull()?.message ?: "Join failed"
                                }
                                joining = false
                            }
                        },
                        onRejoin = {
                            val code = roomCode.trim()
                            val name = playerName.trim()
                            if (code.length != 6 || name.isBlank()) {
                                joinError = "Please enter your name and a 6-character room code."
                                return@JoinGameCard
                            }
                            scope.launch {
                                joining = true
                                joinError = null
                                val result = runCatching { repository.getRoomState(code) }
                                if (result.isSuccess) {
                                    roomStateResult = result
                                } else {
                                    joinError = result.exceptionOrNull()?.message ?: "Rejoin failed"
                                }
                                joining = false
                            }
                        }
                    )
                }
                else -> roomStateResult?.fold(
                    onSuccess = { state ->
                        // Start polling for room state updates every 5 seconds
                        LaunchedEffect(state.roomId) {
                            repository.observeRoomState(state.roomId).collect { result ->
                                if (result.isSuccess) {
                                    roomStateResult = result
                                } else {
                                    refreshError = result.exceptionOrNull()?.message
                                }
                            }
                        }

                        var starting by remember(state.roomId) { mutableStateOf(false) }
                        var startError by remember(state.roomId) { mutableStateOf<String?>(null) }

                        // Header
                        HeaderBar(
                            title = "WHAT NEXT",
                            subtitle = "Turn: ${state.turn} / ${state.maxTurns}",
                            roomCode = state.roomId,
                            refreshing = refreshingRoomState,
                            onRefresh = {
                                if (!refreshingRoomState) {
                                    scope.launch {
                                        refreshingRoomState = true
                                        refreshError = null
                                        val result = runCatching { repository.getRoomState(state.roomId) }
                                        if (result.isSuccess) {
                                            roomStateResult = result
                                        } else {
                                            refreshError = result.exceptionOrNull()?.message
                                        }
                                        refreshingRoomState = false
                                    }
                                }
                            }
                        ) {
                            clipboardManager.setText(AnnotatedString(state.roomId))
                        }
                        Spacer(Modifier.height(16.dp))
                        if (refreshError != null) {
                            Text("Refresh failed: ${refreshError}", color = Color(0xFFFFB4AB))
                            Spacer(Modifier.height(8.dp))
                        }

                        // Lobby controls
                        if (state.phase == "lobby") {
                            Panel {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Lobby: Waiting to start", color = Color(0xFFE5E7EB))
                                    Spacer(Modifier.weight(1f))
                                    Button(
                                        onClick = {
                                            scope.launch {
                                                starting = true
                                                startError = null
                                                val startResult = runCatching { repository.startRoom(state.roomId) }
                                                if (startResult.isSuccess) {
                                                    val refreshResult = runCatching { repository.getRoomState(state.roomId) }
                                                    if (refreshResult.isSuccess) {
                                                        roomStateResult = refreshResult
                                                    } else {
                                                        startError = refreshResult.exceptionOrNull()?.message ?: "Failed to refresh after start."
                                                    }
                                                } else {
                                                    startError = startResult.exceptionOrNull()?.message ?: "Failed to start game"
                                                }
                                                starting = false
                                            }
                                        },
                                        enabled = !starting,
                                        colors = UiDefaults.primaryButtonColors(),
                                    ) {
                                        Text(if (starting) "STARTING…" else "START GAME")
                                    }
                                }
                                if (!startError.isNullOrBlank()) {
                                    Spacer(Modifier.height(8.dp))
                                    Text("Start failed: ${startError}", color = Color(0xFFFFB4AB))
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                        }

                        // Content area
                        when (state.phase) {
                            "player_input", "voting" -> {
                                run {
                                    var inputText by remember(state.roomId, playerName) { mutableStateOf("") }
                                    var submitting by remember { mutableStateOf(false) }
                                    var submitError by remember { mutableStateOf<String?>(null) }

                                    InGameContent(
                                        state = state,
                                        inputText = inputText,
                                        onInputChange = { input ->
                                            submitError = null
                                            inputText = input
                                        },
                                        submitting = submitting,
                                        submitError = submitError,
                                        onSubmit = {
                                            if (playerName.isBlank()) {
                                                submitError = "Please enter your name on the Join screen first."
                                                return@InGameContent
                                            }
                                            if (inputText.isBlank()) return@InGameContent
                                            scope.launch {
                                                submitting = true
                                                submitError = null
                                                val submitResult = runCatching {
                                                    repository.submitInput(state.roomId, playerName.trim(), inputText.trim())
                                                }
                                                if (submitResult.isSuccess) {
                                                    inputText = ""
                                                    // Refresh room state after successful submission
                                                    val refreshResult = runCatching { repository.getRoomState(state.roomId) }
                                                    if (refreshResult.isSuccess) {
                                                        roomStateResult = refreshResult
                                                    } else {
                                                        submitError = refreshResult.exceptionOrNull()?.message ?: "Failed to refresh after submit."
                                                    }
                                                } else {
                                                    submitError = submitResult.exceptionOrNull()?.message ?: "Submit failed"
                                                }
                                                submitting = false
                                            }
                                        },
                                    )
                                }
                            }
                            "game_over" -> {
                                GameOverContent(state = state, currentPlayerName = playerName.trim())
                            }
                            else -> {
                                Panel {
                                    Text("Phase: ${state.phase}", color = Color.White)
                                }
                            }
                        }
                    },
                    onFailure = { error ->
                        Panel {
                            Text("Error: ${error.message ?: "Unknown error"}")
                        }
                    }
                ) ?: Unit
            }
        }
    }
}
