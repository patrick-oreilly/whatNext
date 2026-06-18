package io.github.patrickoreilly.whatnext.mobile.viewmodel

import dev.johnoreilly.whatnext.mobile.network.CreateRoomResponse
import dev.johnoreilly.whatnext.mobile.network.JoinRoomResponse
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull

class CreateRoomViewModelTest {

    @Test
    fun `create and join succeeds — emits navigate to lobby with correct roomId`() = runTest {
        val storedToken = mutableListOf<String>()
        val storedName = mutableListOf<String>()
        val storedRoom = mutableListOf<String>()
        val viewModel = CreateRoomViewModel(
            createRoom = { storyline, maxTurns ->
                CreateRoomResponse(roomId = "NEW001", storyline = storyline, status = "created")
            },
            joinRoom = { roomId, playerName ->
                JoinRoomResponse(roomId = roomId, players = listOf(playerName), status = "joined", playerToken = "tok_host")
            },
            onCredentialsStored = { token, name, room ->
                storedToken.add(token)
                storedName.add(name)
                storedRoom.add(room)
            },
        )

        viewModel.setPlayerName("Alice")
        viewModel.setStoryline("hoop_dreams")
        viewModel.setMaxTurns(10)
        viewModel.createAndJoin()

        assertEquals(listOf("tok_host"), storedToken)
        assertEquals(listOf("Alice"), storedName)
        assertEquals(listOf("NEW001"), storedRoom)
        assertEquals(false, viewModel.uiState.value.isCreating)

        val event = viewModel.navigationEvent.replayCache.firstOrNull()
        assertIs<CreateRoomEvent.NavigateToLobby>(event)
        assertEquals("NEW001", event.roomId)
    }

    @Test
    fun `createAndJoin sets isCreating true during flow then false after`() = runTest {
        var viewModelRef: CreateRoomViewModel? = null
        val viewModel = CreateRoomViewModel(
            createRoom = { _, _ ->
                viewModelRef?.let { assertEquals(true, it.uiState.value.isCreating) }
                CreateRoomResponse(roomId = "R1", storyline = "test", status = "created")
            },
            joinRoom = { _, _ ->
                JoinRoomResponse(roomId = "R1", players = listOf("Bob"), status = "joined", playerToken = "tok")
            },
        )
        viewModelRef = viewModel

        assertEquals(false, viewModel.uiState.value.isCreating)

        viewModel.setPlayerName("Bob")
        viewModel.setStoryline("hoop_dreams")
        viewModel.createAndJoin()

        assertEquals(false, viewModel.uiState.value.isCreating)
    }

    @Test
    fun `createAndJoin emits error event when API call fails`() = runTest {
        val viewModel = CreateRoomViewModel(
            createRoom = { _, _ -> throw Exception("Server error") },
            joinRoom = { _, _ -> throw Exception("Should not be called") },
        )

        viewModel.setPlayerName("Carol")
        viewModel.setStoryline("hoop_dreams")
        viewModel.createAndJoin()

        val event = viewModel.navigationEvent.replayCache.firstOrNull()
        assertIs<CreateRoomEvent.ShowError>(event)
        assertEquals(false, viewModel.uiState.value.isCreating)
    }

    @Test
    fun `cancel emits NavigateBack event immediately`() {
        val viewModel = CreateRoomViewModel(
            createRoom = { _, _ -> CreateRoomResponse("R", "s", "ok") },
            joinRoom = { _, _ -> JoinRoomResponse("R", listOf(), "ok", "t") },
        )

        viewModel.cancel()

        val event = viewModel.navigationEvent.replayCache.firstOrNull()
        assertIs<CreateRoomEvent.NavigateBack>(event)
    }

    @Test
    fun `blank playerName fails validation and shows error`() = runTest {
        val viewModel = CreateRoomViewModel(
            createRoom = { _, _ -> CreateRoomResponse("R", "s", "ok") },
            joinRoom = { _, _ -> JoinRoomResponse("R", listOf(), "ok", "t") },
        )

        viewModel.setPlayerName("   ")
        viewModel.setStoryline("hoop_dreams")
        viewModel.createAndJoin()

        val errors = viewModel.uiState.value.validationErrors
        assertEquals(true, errors.any { it.contains("name", ignoreCase = true) })
        assertEquals(false, viewModel.uiState.value.isCreating)
    }

    @Test
    fun `no storyline selected fails validation`() = runTest {
        val viewModel = CreateRoomViewModel(
            createRoom = { _, _ -> CreateRoomResponse("R", "s", "ok") },
            joinRoom = { _, _ -> JoinRoomResponse("R", listOf(), "ok", "t") },
        )

        viewModel.setPlayerName("Alice")
        viewModel.createAndJoin()

        val errors = viewModel.uiState.value.validationErrors
        assertEquals(true, errors.any { it.contains("storyline", ignoreCase = true) })
    }

    @Test
    fun `name exceeding 20 characters fails validation`() = runTest {
        val viewModel = CreateRoomViewModel(
            createRoom = { _, _ -> CreateRoomResponse("R", "s", "ok") },
            joinRoom = { _, _ -> JoinRoomResponse("R", listOf(), "ok", "t") },
        )

        viewModel.setPlayerName("A".repeat(21))
        viewModel.setStoryline("hoop_dreams")
        viewModel.createAndJoin()

        val errors = viewModel.uiState.value.validationErrors
        assertEquals(true, errors.any { it.contains("20", ignoreCase = true) })
    }

    @Test
    fun `default maxTurns is 10`() {
        val viewModel = CreateRoomViewModel(
            createRoom = { _, _ -> CreateRoomResponse("R", "s", "ok") },
            joinRoom = { _, _ -> JoinRoomResponse("R", listOf(), "ok", "t") },
        )

        assertEquals(10, viewModel.uiState.value.maxTurns)
    }

    @Test
    fun `default selectedStoryline is null`() {
        val viewModel = CreateRoomViewModel(
            createRoom = { _, _ -> CreateRoomResponse("R", "s", "ok") },
            joinRoom = { _, _ -> JoinRoomResponse("R", listOf(), "ok", "t") },
        )

        assertNull(viewModel.uiState.value.selectedStoryline)
    }

    @Test
    fun `setMaxTurns clamps values below 5 to 5`() {
        val viewModel = CreateRoomViewModel(
            createRoom = { _, _ -> CreateRoomResponse("R", "s", "ok") },
            joinRoom = { _, _ -> JoinRoomResponse("R", listOf(), "ok", "t") },
        )

        viewModel.setMaxTurns(1)
        assertEquals(5, viewModel.uiState.value.maxTurns)
    }

    @Test
    fun `setMaxTurns clamps values above 20 to 20`() {
        val viewModel = CreateRoomViewModel(
            createRoom = { _, _ -> CreateRoomResponse("R", "s", "ok") },
            joinRoom = { _, _ -> JoinRoomResponse("R", listOf(), "ok", "t") },
        )

        viewModel.setMaxTurns(99)
        assertEquals(20, viewModel.uiState.value.maxTurns)
    }

    @Test
    fun `setStoryline with invalid id keeps previous selection`() {
        val viewModel = CreateRoomViewModel(
            createRoom = { _, _ -> CreateRoomResponse("R", "s", "ok") },
            joinRoom = { _, _ -> JoinRoomResponse("R", listOf(), "ok", "t") },
        )

        viewModel.setStoryline("hoop_dreams")
        viewModel.setStoryline("nonexistent")

        assertEquals("hoop_dreams", viewModel.uiState.value.selectedStoryline?.id)
    }
}
