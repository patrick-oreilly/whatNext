package io.github.patrickoreilly.whatnext.mobile.state

import dev.johnoreilly.whatnext.mobile.network.RoomState
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

@OptIn(ExperimentalCoroutinesApi::class)

class RoomStateHolderTest {
    private fun fakeRoomState(phase: String = "lobby", roomId: String = "TEST01") = RoomState(
        roomId = roomId, storyLine = "test", players = listOf("Alice"),
        scores = emptyMap(), turn = 1, phase = phase, storyHistory = emptyList(),
        maxTurns = 10, playerInputs = emptyList(),
    )

    @Test
    fun `startPolling emits RoomState from the API`() = runTest {
        var fetchCount = 0
        val holder = RoomStateHolder(
            fetchState = {
                fakeRoomState(
                    phase = if (fetchCount == 0) "lobby" else "player_input"
                ).also { fetchCount++ }
            },
            activeIntervalMs = 50L,
            scope = backgroundScope,
        )

        holder.startPolling("TEST01")
        runCurrent()

        assertEquals("lobby", holder.state.value?.phase ?: "")
        assertEquals(1, fetchCount)
    }

    @Test
    fun `stopPolling prevents further emissions`() = runTest {
        var fetchCount = 0
        val holder = RoomStateHolder(
            fetchState = { fakeRoomState(phase = "lobby").also { fetchCount++ } },
            activeIntervalMs = 50L,
            scope = backgroundScope,
        )

        holder.startPolling("TEST01")
        runCurrent()
        val countAtStop = fetchCount
        holder.stopPolling()

        // Advance past many poll intervals — no more fetches should occur
        advanceTimeBy(5000)
        runCurrent()

        assertEquals(countAtStop, fetchCount)
    }

    @Test
    fun `multiple startPolling calls reset polling for the new room`() = runTest {
        var currentRoomId = "none"
        val holder = RoomStateHolder(
            fetchState = { fakeRoomState(roomId = currentRoomId) },
            activeIntervalMs = 5000L,
            scope = backgroundScope,
        )

        currentRoomId = "ROOM1"
        holder.startPolling("ROOM1")
        runCurrent()
        assertEquals("ROOM1", holder.state.value?.roomId ?: "")

        currentRoomId = "ROOM2"
        holder.startPolling("ROOM2")
        runCurrent()
        assertEquals("ROOM2", holder.state.value?.roomId ?: "")
    }
}
