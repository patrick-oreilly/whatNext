package io.github.patrickoreilly.whatnext.mobile.viewmodel

import dev.johnoreilly.whatnext.mobile.network.RoomState
import dev.johnoreilly.whatnext.mobile.network.StartGameResponse
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LobbyViewModelTest {

    private fun fakeRoomState(
        players: List<String> = listOf("Alice", "Bob"),
        phase: String = "lobby",
    ) = RoomState(
        roomId = "TEST01", storyLine = "test", players = players,
        scores = emptyMap(), turn = 1, phase = phase, storyHistory = emptyList(),
        maxTurns = 10, playerInputs = emptyList(),
    )

    @Test
    fun `first player in list is detected as host`() {
        val viewModel = LobbyViewModel(
            playerName = "Alice",
            startGame = { _, _ -> StartGameResponse("started", "T", 1, "generating_story") },
        )
        viewModel.updateRoomState(fakeRoomState(players = listOf("Alice", "Bob")))

        assertEquals(true, viewModel.uiState.value.isHost)
    }

    @Test
    fun `second player is not detected as host`() {
        val viewModel = LobbyViewModel(
            playerName = "Bob",
            startGame = { _, _ -> StartGameResponse("started", "T", 1, "generating_story") },
        )
        viewModel.updateRoomState(fakeRoomState(players = listOf("Alice", "Bob")))

        assertEquals(false, viewModel.uiState.value.isHost)
    }

    @Test
    fun `start game is disabled when fewer than 2 players`() {
        val viewModel = LobbyViewModel(
            playerName = "Alice",
            startGame = { _, _ -> StartGameResponse("started", "T", 1, "generating_story") },
        )
        viewModel.updateRoomState(fakeRoomState(players = listOf("Alice")))

        assertEquals(false, viewModel.uiState.value.canStartGame)
    }

    @Test
    fun `start game is enabled when host and 2 or more players`() {
        val viewModel = LobbyViewModel(
            playerName = "Alice",
            startGame = { _, _ -> StartGameResponse("started", "T", 1, "generating_story") },
        )
        viewModel.updateRoomState(fakeRoomState(players = listOf("Alice", "Bob")))

        assertEquals(true, viewModel.uiState.value.canStartGame)
    }

    @Test
    fun `non-host cannot start game even with enough players`() {
        val viewModel = LobbyViewModel(
            playerName = "Bob",
            startGame = { _, _ -> StartGameResponse("started", "T", 1, "generating_story") },
        )
        viewModel.updateRoomState(fakeRoomState(players = listOf("Alice", "Bob", "Carol")))

        assertEquals(false, viewModel.uiState.value.canStartGame)
    }

    @Test
    fun `start game triggers API call and emits navigate event on success`() = runTest {
        var startCalled = false
        val viewModel = LobbyViewModel(
            playerName = "Alice",
            playerToken = "tok_abc",
            startGame = { roomId, token ->
                startCalled = true
                assertEquals("TEST01", roomId)
                assertEquals("tok_abc", token)
                StartGameResponse("started", roomId, 1, "generating_story")
            },
        )
        viewModel.updateRoomState(fakeRoomState(players = listOf("Alice", "Bob")))

        viewModel.startGame("TEST01")

        assertTrue(startCalled)
        val event = viewModel.navigationEvent.replayCache.firstOrNull()
        assertIs<LobbyEvent.NavigateToGame>(event)
        assertEquals("TEST01", event?.roomId)
    }

    @Test
    fun `start game emits error when API call fails`() = runTest {
        val viewModel = LobbyViewModel(
            playerName = "Alice",
            playerToken = "tok_abc",
            startGame = { _, _ -> throw Exception("Start failed") },
        )
        viewModel.updateRoomState(fakeRoomState(players = listOf("Alice", "Bob")))

        viewModel.startGame("TEST01")

        val event = viewModel.navigationEvent.replayCache.firstOrNull()
        assertIs<LobbyEvent.ShowError>(event)
    }

    @Test
    fun `phase change to player_input emits NavigateToGame`() {
        val viewModel = LobbyViewModel(
            playerName = "Alice",
            startGame = { _, _ -> StartGameResponse("ok", "T", 1, "player_input") },
        )
        viewModel.updateRoomState(fakeRoomState(phase = "player_input"))

        val event = viewModel.navigationEvent.replayCache.firstOrNull()
        assertIs<LobbyEvent.NavigateToGame>(event)
    }

    @Test
    fun `phase change to game_over emits NavigateToGameOver`() {
        val viewModel = LobbyViewModel(
            playerName = "Alice",
            startGame = { _, _ -> StartGameResponse("ok", "T", 1, "game_over") },
        )
        viewModel.updateRoomState(fakeRoomState(phase = "game_over"))

        val event = viewModel.navigationEvent.replayCache.firstOrNull()
        assertIs<LobbyEvent.NavigateToGameOver>(event)
    }

    @Test
    fun `phase change to generating_story emits NavigateToGame`() {
        val viewModel = LobbyViewModel(
            playerName = "Alice",
            startGame = { _, _ -> StartGameResponse("ok", "T", 1, "generating_story") },
        )
        viewModel.updateRoomState(fakeRoomState(phase = "generating_story"))

        val event = viewModel.navigationEvent.replayCache.firstOrNull()
        assertIs<LobbyEvent.NavigateToGame>(event)
    }

    @Test
    fun `lobby phase does not emit navigation event`() {
        val viewModel = LobbyViewModel(
            playerName = "Alice",
            startGame = { _, _ -> StartGameResponse("ok", "T", 1, "lobby") },
        )
        viewModel.updateRoomState(fakeRoomState(phase = "lobby"))

        val event = viewModel.navigationEvent.replayCache.firstOrNull()
        assertNull(event)
    }

    @Test
    fun `player list is exposed in UI state`() {
        val viewModel = LobbyViewModel(
            playerName = "Alice",
            startGame = { _, _ -> StartGameResponse("ok", "T", 1, "lobby") },
        )
        viewModel.updateRoomState(fakeRoomState(players = listOf("Alice", "Bob", "Carol")))

        assertEquals(listOf("Alice", "Bob", "Carol"), viewModel.uiState.value.players)
    }
}
