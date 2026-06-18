package io.github.patrickoreilly.whatnext.mobile.state

import dev.johnoreilly.whatnext.mobile.network.RoomState
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

@OptIn(ExperimentalCoroutinesApi::class)
class RoomStateHolderAdaptiveTest {
    private fun fakeRoomState(phase: String = "lobby", roomId: String = "TEST01") = RoomState(
        roomId = roomId, storyLine = "test", players = listOf("Alice"),
        scores = emptyMap(), turn = 1, phase = phase, storyHistory = emptyList(),
        maxTurns = 10, playerInputs = emptyList(),
    )

    @Test
    fun `phaseToIntervalMs returns 10000 for lobby phase`() = runTest {
        val holder = RoomStateHolder(lobbyIntervalMs = 10000L, activeIntervalMs = 3000L, scope = this)
        assertEquals(10000L, holder.phaseToIntervalMs("lobby"))
    }

    @Test
    fun `phaseToIntervalMs returns active interval for player_input and voting phases`() = runTest {
        val holder = RoomStateHolder(lobbyIntervalMs = 10000L, activeIntervalMs = 3000L, scope = this)
        assertEquals(3000L, holder.phaseToIntervalMs("player_input"))
        assertEquals(3000L, holder.phaseToIntervalMs("voting"))
    }

    @Test
    fun `phaseToIntervalMs returns active interval for unknown phases`() = runTest {
        val holder = RoomStateHolder(lobbyIntervalMs = 10000L, activeIntervalMs = 3000L, scope = this)
        assertEquals(3000L, holder.phaseToIntervalMs("generating_story"))
        assertEquals(3000L, holder.phaseToIntervalMs("game_over"))
    }

    @Test
    fun `polling interval adjusts when phase changes to lobby`() = runTest {
        var fetchCount = 0
        val holder = RoomStateHolder(
            fetchState = {
                fakeRoomState(phase = if (fetchCount == 0) "player_input" else "lobby").also { fetchCount++ }
            },
            lobbyIntervalMs = 100L,
            activeIntervalMs = 50L,
            scope = backgroundScope,
        )

        holder.startPolling("TEST01")
        runCurrent()
        assertEquals(1, fetchCount)

        // After first poll (player_input), interval should be 50ms
        // Advance 60ms — enough for one more poll at 50ms rate
        advanceTimeBy(60)
        runCurrent()
        assertEquals(2, fetchCount)

        // After second poll (lobby), interval should be 100ms
        // Advance 60ms — NOT enough for a poll at 100ms rate
        advanceTimeBy(60)
        runCurrent()
        assertEquals(2, fetchCount) // still 2 — 100ms hasn't elapsed

        // Advance to full 100ms from last poll
        advanceTimeBy(50)
        runCurrent()
        assertEquals(3, fetchCount)
    }
}
