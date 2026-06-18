package io.github.patrickoreilly.whatnext.mobile.viewmodel

import dev.johnoreilly.whatnext.mobile.network.JoinRoomResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull

@OptIn(ExperimentalCoroutinesApi::class)
class JoinRoomViewModelTest {
    private val testDispatcher = StandardTestDispatcher()

    @BeforeTest
    fun setup() { Dispatchers.setMain(testDispatcher) }
    @AfterTest
    fun tearDown() { Dispatchers.resetMain() }

    @Test fun `blank player name shows validation error`() = runTest {
        val vm = JoinRoomViewModel(joinRoom = { _: String, _: String -> throw Exception() })
        vm.playerName = ""; vm.roomCode = "ABCDEF"; vm.join()
        advanceUntilIdle()
        assertEquals("Name cannot be blank", vm.uiState.value.playerNameError)
    }

    @Test fun `non-6-character room code shows validation error`() = runTest {
        val vm = JoinRoomViewModel(joinRoom = { _: String, _: String -> throw Exception() })
        vm.playerName = "Alice"; vm.roomCode = "ABC"; vm.join()
        advanceUntilIdle()
        assertEquals("Room code must be 6 characters", vm.uiState.value.roomCodeError)
    }

    @Test fun `valid input does not set validation errors`() = runTest {
        val vm = JoinRoomViewModel(joinRoom = { _: String, _: String -> JoinRoomResponse("R",emptyList(),"joined","t") })
        vm.playerName = "Alice"; vm.roomCode = "ABCDEF"; vm.join()
        advanceUntilIdle()
        assertNull(vm.uiState.value.playerNameError)
        assertNull(vm.uiState.value.roomCodeError)
    }

    @Test fun `name already taken shows inline error`() = runTest {
        val vm = JoinRoomViewModel(joinRoom = { _: String, _: String -> throw Exception("name already taken") })
        vm.playerName = "Alice"; vm.roomCode = "ABCDEF"; vm.join()
        advanceUntilIdle()
        assertEquals("name already taken", vm.uiState.value.playerNameError)
        assertEquals(false, vm.uiState.value.isLoading)
    }

    @Test fun `room not found shows inline error`() = runTest {
        val vm = JoinRoomViewModel(joinRoom = { _: String, _: String -> throw Exception("room not found") })
        vm.playerName = "Alice"; vm.roomCode = "ABCDEF"; vm.join()
        advanceUntilIdle()
        assertEquals("Room not found. Please check the code.", vm.uiState.value.roomCodeError)
        assertEquals(false, vm.uiState.value.isLoading)
    }

    @Test fun `room does not exist shows inline error`() = runTest {
        val vm = JoinRoomViewModel(joinRoom = { _: String, _: String -> throw Exception("room does not exist") })
        vm.playerName = "Alice"; vm.roomCode = "ABCDEF"; vm.join()
        advanceUntilIdle()
        assertEquals("Room not found. Please check the code.", vm.uiState.value.roomCodeError)
        assertEquals(false, vm.uiState.value.isLoading)
    }

    @Test fun `room full shows inline error`() = runTest {
        val vm = JoinRoomViewModel(joinRoom = { _: String, _: String -> throw Exception("room is full") })
        vm.playerName = "Alice"; vm.roomCode = "ABCDEF"; vm.join()
        advanceUntilIdle()
        assertEquals("Room is full. Cannot join.", vm.uiState.value.roomCodeError)
        assertEquals(false, vm.uiState.value.isLoading)
    }

    @Test fun `game already started shows inline error`() = runTest {
        val vm = JoinRoomViewModel(joinRoom = { _: String, _: String -> throw Exception("game already started") })
        vm.playerName = "Alice"; vm.roomCode = "ABCDEF"; vm.join()
        advanceUntilIdle()
        assertEquals("Game has already started. Cannot join.", vm.uiState.value.roomCodeError)
        assertEquals(false, vm.uiState.value.isLoading)
    }

    @Test fun `join calls API with trimmed room code and player name`() = runTest {
        var capturedRoomId: String? = null; var capturedName: String? = null
        val vm = JoinRoomViewModel(joinRoom = { r, n -> capturedRoomId = r; capturedName = n; JoinRoomResponse(r,listOf(n),"joined","t") })
        vm.playerName = "  Alice  "; vm.roomCode = "  ABC123  "; vm.join()
        advanceUntilIdle()
        assertEquals("ABC123", capturedRoomId); assertEquals("Alice", capturedName)
    }

    @Test fun `join stores credentials and emits NavigateToLobby on success`() = runTest {
        val storedToken = mutableListOf<String>(); val storedName = mutableListOf<String>(); val storedRoom = mutableListOf<String>()
        val vm = JoinRoomViewModel(
            joinRoom = { _: String, _: String -> JoinRoomResponse("ROOM01",listOf("Alice"),"joined","tok_abc") },
            onCredentialsStored = { t, n, r -> storedToken.add(t); storedName.add(n); storedRoom.add(r) },
        )
        vm.playerName = "Alice"; vm.roomCode = "ABCDEF"
        val job = launch { vm.navigationEvent.collect { } }
        vm.join()
        advanceUntilIdle()
        assertEquals(listOf("tok_abc"), storedToken); assertEquals(listOf("Alice"), storedName); assertEquals(listOf("ROOM01"), storedRoom)
        val event = vm.navigationEvent.replayCache.firstOrNull()
        assertIs<JoinRoomEvent.NavigateToLobby>(event); assertEquals("ROOM01", event?.roomId)
        job.cancel()
    }

    @Test fun `join sets isLoading true during call then false after`() = runTest {
        var ref: JoinRoomViewModel? = null; var captured: Boolean? = null
        val vm = JoinRoomViewModel(joinRoom = { _: String, _: String -> captured = ref?.uiState?.value?.isLoading; JoinRoomResponse("R",listOf(),"joined","t") })
        ref = vm; vm.playerName = "Alice"; vm.roomCode = "ABCDEF"
        assertEquals(false, vm.uiState.value.isLoading)
        vm.join()
        assertEquals(true, captured); assertEquals(false, vm.uiState.value.isLoading)
    }
}
