package dev.johnoreilly.whatnext.mobile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.Button
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.russhwolf.settings.Settings
import dev.johnoreilly.whatnext.mobile.components.HeaderBar
import dev.johnoreilly.whatnext.mobile.components.Panel
import dev.johnoreilly.whatnext.mobile.components.InGameContent
import dev.johnoreilly.whatnext.mobile.components.GameOverContent
import dev.johnoreilly.whatnext.mobile.repository.WhatNextRepository
import dev.johnoreilly.whatnext.mobile.UiDefaults
import dev.johnoreilly.whatnext.mobile.ui.gametheme.GameTheme
import dev.johnoreilly.whatnext.mobile.ui.gametheme.LocalGameColors
import io.github.patrickoreilly.whatnext.mobile.navigation.AutoRejoinResult
import io.github.patrickoreilly.whatnext.mobile.navigation.Route
import io.github.patrickoreilly.whatnext.mobile.navigation.resolveAutoRejoin
import io.github.patrickoreilly.whatnext.mobile.settings.CredentialStore
import io.github.patrickoreilly.whatnext.mobile.state.RoomStateHolder
import io.github.patrickoreilly.whatnext.mobile.viewmodel.CreateRoomEvent
import io.github.patrickoreilly.whatnext.mobile.viewmodel.CreateRoomViewModel
import io.github.patrickoreilly.whatnext.mobile.viewmodel.JoinRoomViewModel
import io.github.patrickoreilly.whatnext.mobile.viewmodel.LobbyEvent
import io.github.patrickoreilly.whatnext.mobile.viewmodel.LobbyViewModel
import io.github.patrickoreilly.whatnext.mobile.viewmodel.StorylineOption
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import org.jetbrains.compose.ui.tooling.preview.Preview

@Composable
@Preview
fun App() {
    GameTheme {
        val navController = rememberNavController()
        val repository = remember { WhatNextRepository() }
        val settings = remember { Settings() }
        val credentialStore = remember { CredentialStore(settings) }
        val roomStateHolder = remember { RoomStateHolder.instance }

        // Auto-rejoin on cold launch
        LaunchedEffect(Unit) {
            val result = resolveAutoRejoin(credentialStore) { repository.getRoomState(it) }
            when (result) {
                is AutoRejoinResult.NavigateTo -> {
                    navController.navigate(result.route) {
                        popUpTo(Route.Home) { inclusive = true }
                    }
                }
                is AutoRejoinResult.ShowHomeWithMessage,
                is AutoRejoinResult.NoCredentials -> {
                    navController.navigate(Route.Home)
                }
            }
        }

        NavHost(
            navController = navController,
            startDestination = Route.Home,
        ) {
            composable<Route.Home> {
                HomeScreen(
                    onCreateRoom = { navController.navigate(Route.CreateRoom) },
                    onJoinRoom = { navController.navigate(Route.JoinRoom) },
                )
            }
            composable<Route.Lobby> { backStackEntry ->
                val route: Route.Lobby = backStackEntry.toRoute()
                LobbyScreen(
                    roomId = route.roomId,
                    credentialStore = credentialStore,
                    roomStateHolder = roomStateHolder,
                    repository = repository,
                    onNavigateToGame = { roomId ->
                        navController.navigate(Route.Game(roomId)) {
                            popUpTo(Route.Lobby(roomId)) { inclusive = true }
                        }
                    },
                    onNavigateToGameOver = { roomId ->
                        navController.navigate(Route.GameOver(roomId)) {
                            popUpTo(Route.Lobby(roomId)) { inclusive = true }
                        }
                    },
                )
            }
            composable<Route.Game> { backStackEntry ->
                val route: Route.Game = backStackEntry.toRoute()
                GameScreen(
                    roomId = route.roomId,
                    repository = repository,
                    credentialStore = credentialStore,
                    roomStateHolder = roomStateHolder,
                    onGameOver = {
                        navController.navigate(Route.GameOver(route.roomId)) {
                            popUpTo(Route.Game(route.roomId)) { inclusive = true }
                        }
                    },
                )
            }
            composable<Route.GameOver> { backStackEntry ->
                val route: Route.GameOver = backStackEntry.toRoute()
                GameOverScreen(
                    roomId = route.roomId,
                    roomStateHolder = roomStateHolder,
                    credentialStore = credentialStore,
                )
            }
            composable<Route.CreateRoom> {
                CreateRoomScreen(
                    credentialStore = credentialStore,
                    onCreated = { roomId ->
                        navController.navigate(Route.Lobby(roomId)) {
                            popUpTo(Route.Home) { inclusive = true }
                        }
                    },
                )
            }
            composable<Route.JoinRoom> {
                val joinViewModel = remember {
                    JoinRoomViewModel(
                        joinRoom = { roomId, playerName -> repository.joinRoom(roomId, playerName) },
                        onCredentialsStored = { token, name, room ->
                            credentialStore.playerToken = token
                            credentialStore.playerName = name
                            credentialStore.roomId = room
                        },
                    )
                }
                JoinRoomScreen(
                    viewModel = joinViewModel,
                    onCancel = { navController.popBackStack() },
                    onJoined = { roomId ->
                        navController.navigate(Route.Lobby(roomId)) {
                            popUpTo(Route.Home) { inclusive = true }
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun LobbyScreen(
    roomId: String,
    credentialStore: CredentialStore,
    roomStateHolder: RoomStateHolder,
    repository: WhatNextRepository,
    onNavigateToGame: (roomId: String) -> Unit,
    onNavigateToGameOver: (roomId: String) -> Unit,
) {
    val gameColors = LocalGameColors.current
    val scope = rememberCoroutineScope()
    val clipboardManager = LocalClipboardManager.current
    val roomState by roomStateHolder.state.collectAsState()

    val lobbyViewModel = remember {
        LobbyViewModel(
            playerName = credentialStore.playerName ?: "",
            playerToken = credentialStore.playerToken,
        )
    }

    LaunchedEffect(roomId) {
        roomStateHolder.startPolling(roomId)
    }

    // Feed room state into ViewModel
    LaunchedEffect(roomState) {
        roomState?.let { lobbyViewModel.updateRoomState(it) }
    }

    // Handle navigation events from ViewModel
    LaunchedEffect(Unit) {
        lobbyViewModel.navigationEvent.collectLatest { event ->
            when (event) {
                is LobbyEvent.NavigateToGame -> onNavigateToGame(event.roomId)
                is LobbyEvent.NavigateToGameOver -> onNavigateToGameOver(event.roomId)
                is LobbyEvent.ShowError -> { /* snackbar handled by UI */ }
            }
        }
    }

    val uiState by lobbyViewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(gameColors.surfaceNearBlack)
            .verticalScroll(rememberScrollState())
            .systemBarsPadding()
            .padding(16.dp)
    ) {
        roomState?.let { state ->
            // Room code header
            Panel(modifier = Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Game Lobby", color = Color.White, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                        Spacer(Modifier.height(4.dp))
                        Text("Room: ${state.roomId}", color = Color(0xFFF59E0B))
                    }
                    Button(
                        onClick = { clipboardManager.setText(AnnotatedString(state.roomId)) },
                        colors = UiDefaults.primaryButtonColors(),
                    ) {
                        Text("COPY")
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Player list
            Panel(modifier = Modifier.fillMaxWidth(), title = "PLAYERS") {
                state.players.forEachIndexed { index, player ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = player,
                            color = Color.White,
                            modifier = Modifier.weight(1f),
                        )
                        if (index == 0) {
                            Text(
                                text = "HOST",
                                color = Color(0xFFF59E0B),
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                            )
                        }
                    }
                }
                if (state.players.size < 2) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Waiting for at least one more player to join…",
                        color = Color(0xFF9CA3AF),
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Story history placeholder
            Panel(modifier = Modifier.fillMaxWidth()) {
                Text(
                    "The story is about to begin…",
                    color = Color(0xFF9CA3AF),
                )
            }

            Spacer(Modifier.height(16.dp))

            // Start game button (host only)
            if (uiState.isHost) {
                Button(
                    onClick = {
                        scope.launch { lobbyViewModel.startGame(state.roomId) }
                    },
                    enabled = uiState.canStartGame && !uiState.isStarting,
                    modifier = Modifier.fillMaxWidth(),
                    colors = UiDefaults.primaryButtonColors(),
                ) {
                    Text(
                        if (uiState.isStarting) "STARTING…"
                        else if (!uiState.canStartGame) "WAITING FOR PLAYERS"
                        else "START GAME"
                    )
                }
            } else {
                Text(
                    "Waiting for host to start the game…",
                    color = Color(0xFF9CA3AF),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            if (uiState.error != null) {
                Spacer(Modifier.height(8.dp))
                Text("Error: ${uiState.error}", color = Color(0xFFFFB4AB))
            }
        } ?: run {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator()
                Spacer(Modifier.width(12.dp))
                Text("Loading room…")
            }
        }
    }
}

@Composable
private fun GameScreen(
    roomId: String,
    repository: WhatNextRepository,
    credentialStore: CredentialStore,
    roomStateHolder: RoomStateHolder,
    onGameOver: () -> Unit,
) {
    val gameColors = LocalGameColors.current
    val scope = rememberCoroutineScope()
    val clipboardManager = LocalClipboardManager.current
    val roomState by roomStateHolder.state.collectAsState()

    LaunchedEffect(roomId) {
        roomStateHolder.startPolling(roomId)
    }

    var refreshingRoomState by remember { mutableStateOf(false) }
    var refreshError by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(gameColors.surfaceNearBlack)
            .verticalScroll(rememberScrollState())
            .systemBarsPadding()
            .padding(16.dp)
    ) {
        roomState?.let { state ->
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
                                roomStateHolder.startPolling(roomId)
                            } else {
                                refreshError = result.exceptionOrNull()?.message
                            }
                            refreshingRoomState = false
                        }
                    }
                },
            ) {
                clipboardManager.setText(AnnotatedString(state.roomId))
            }

            Spacer(Modifier.height(16.dp))
            if (refreshError != null) {
                Text("Refresh failed: $refreshError", color = Color(0xFFFFB4AB))
                Spacer(Modifier.height(8.dp))
            }

            when (state.phase) {
                "player_input", "voting" -> {
                    var inputText by remember(state.roomId, credentialStore.playerName) { mutableStateOf("") }
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
                            val name = credentialStore.playerName ?: ""
                            if (name.isBlank()) {
                                submitError = "Please enter your name on the Join screen first."
                                return@InGameContent
                            }
                            if (inputText.isBlank()) return@InGameContent
                            scope.launch {
                                submitting = true
                                submitError = null
                                val submitResult = runCatching {
                                    repository.submitInput(
                                        state.roomId, name.trim(), inputText.trim(),
                                        credentialStore.playerToken,
                                    )
                                }
                                if (submitResult.isSuccess) {
                                    inputText = ""
                                    roomStateHolder.startPolling(roomId)
                                } else {
                                    submitError = submitResult.exceptionOrNull()?.message ?: "Submit failed"
                                }
                                submitting = false
                            }
                        },
                    )
                }
                "game_over" -> {
                    onGameOver()
                }
                else -> {
                    Panel { Text("Phase: ${state.phase}", color = Color.White) }
                }
            }
        } ?: run {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator()
                Spacer(Modifier.width(12.dp))
                Text("Loading game…")
            }
        }
    }
}

@Composable
private fun GameOverScreen(
    roomId: String,
    roomStateHolder: RoomStateHolder,
    credentialStore: CredentialStore,
) {
    val gameColors = LocalGameColors.current
    val roomState by roomStateHolder.state.collectAsState()

    LaunchedEffect(roomId) {
        roomStateHolder.startPolling(roomId)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(gameColors.surfaceNearBlack)
            .verticalScroll(rememberScrollState())
            .systemBarsPadding()
            .padding(16.dp)
    ) {
        roomState?.let { state ->
            GameOverContent(state = state, currentPlayerName = credentialStore.playerName ?: "")
        } ?: run {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator()
                Spacer(Modifier.width(12.dp))
                Text("Loading results…")
            }
        }
    }
}

@Composable
private fun CreateRoomScreen(
    credentialStore: CredentialStore,
    onCreated: (roomId: String) -> Unit,
) {
    val gameColors = LocalGameColors.current
    val scope = rememberCoroutineScope()
    val viewModel = remember {
        CreateRoomViewModel(
            onCredentialsStored = { token, name, room ->
                credentialStore.playerToken = token
                credentialStore.playerName = name
                credentialStore.roomId = room
            },
        )
    }

    // Pre-fill name from persistence
    LaunchedEffect(Unit) {
        credentialStore.playerName?.let { viewModel.setPlayerName(it) }
    }

    // Handle navigation
    LaunchedEffect(Unit) {
        viewModel.navigationEvent.collectLatest { event ->
            when (event) {
                is CreateRoomEvent.NavigateToLobby -> onCreated(event.roomId)
                is CreateRoomEvent.NavigateBack -> onCreated("") // navigate back handled by caller
                is CreateRoomEvent.ShowError -> { /* shown in UI */ }
            }
        }
    }

    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(gameColors.surfaceNearBlack)
            .verticalScroll(rememberScrollState())
            .systemBarsPadding()
            .padding(16.dp)
    ) {
        Text(
            "CREATE ROOM",
            color = Color.White,
            fontWeight = androidx.compose.ui.text.font.FontWeight.Black,
        )
        Spacer(Modifier.height(20.dp))

        // Name field
        Text("YOUR NAME", color = Color.White, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = uiState.playerName,
            onValueChange = { viewModel.setPlayerName(it.take(20)) },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Enter your name") },
            singleLine = true,
            colors = UiDefaults.outlinedTextFieldColors(),
        )
        Spacer(Modifier.height(20.dp))

        // Storyline selector
        Text("CHOOSE YOUR STORY", color = Color.White, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        uiState.storylineOptions.forEach { option ->
            val isSelected = uiState.selectedStoryline?.id == option.id
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .let { if (isSelected) it.border(2.dp, Color(0xFFF59E0B), RoundedCornerShape(12.dp)) else it },
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, if (isSelected) Color(0xFFF59E0B) else Color(0xFF374151)),
                colors = CardDefaults.cardColors(
                    containerColor = if (isSelected) Color(0xFF1E293B) else Color(0xFF111827)
                ),
                onClick = { viewModel.setStoryline(option.id) },
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text(option.label, color = Color.White, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                    Spacer(Modifier.height(4.dp))
                    Text(option.description, color = Color(0xFF9CA3AF))
                }
            }
        }
        Spacer(Modifier.height(20.dp))

        // Turns slider
        Text("MAX TURNS: ${uiState.maxTurns}", color = Color.White, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Slider(
            value = uiState.maxTurns.toFloat(),
            onValueChange = { viewModel.setMaxTurns(it.toInt()) },
            valueRange = 5f..20f,
            steps = 14,
            modifier = Modifier.fillMaxWidth(),
        )
        Row(modifier = Modifier.fillMaxWidth()) {
            Text("Quick (5)", color = Color(0xFF9CA3AF), modifier = Modifier.weight(1f))
            Text("Standard (10)", color = Color(0xFF9CA3AF), modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            Text("Epic (20)", color = Color(0xFF9CA3AF), modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.End)
        }
        Spacer(Modifier.height(20.dp))

        // Validation errors
        if (uiState.validationErrors.isNotEmpty()) {
            uiState.validationErrors.forEach { error ->
                Text(error, color = Color(0xFFFFB4AB))
            }
            Spacer(Modifier.height(8.dp))
        }

        // Buttons
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(
                onClick = { viewModel.cancel() },
                enabled = !uiState.isCreating,
                modifier = Modifier.weight(1f),
            ) {
                Text("CANCEL")
            }
            Spacer(Modifier.width(16.dp))
            Button(
                onClick = { scope.launch { viewModel.createAndJoin() } },
                enabled = !uiState.isCreating,
                modifier = Modifier.weight(1f),
                colors = UiDefaults.primaryButtonColors(),
            ) {
                Text(if (uiState.isCreating) "CREATING…" else "CREATE ROOM")
            }
        }
    }
}

@Composable
private fun PlaceholderScreen(title: String) {
    val gameColors = LocalGameColors.current
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(gameColors.surfaceNearBlack)
            .systemBarsPadding(),
        contentAlignment = Alignment.Center,
    ) {
        Text(title, color = Color.White)
    }
}
