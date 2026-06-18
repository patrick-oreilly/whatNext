package io.github.patrickoreilly.whatnext.mobile.state

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

@OptIn(ExperimentalCoroutinesApi::class)
class RoomStateHolderBackoffTest {

    @Test
    fun `retryable errors are retried with exponential backoff`() = runTest {
        var attempts = 0
        val holder = RoomStateHolder(
            fetchState = {
                attempts++
                throw Exception("Server error")
            },
            activeIntervalMs = 50L,
            scope = backgroundScope,
        )

        holder.startPolling("TEST01")
        runCurrent()
        assertEquals(1, attempts)

        // First retry after 500ms
        advanceTimeBy(500)
        runCurrent()
        assertEquals(2, attempts)

        // Second retry after 1000ms
        advanceTimeBy(1000)
        runCurrent()
        assertEquals(3, attempts)

        // Third retry after 2000ms
        advanceTimeBy(2000)
        runCurrent()
        assertEquals(4, attempts)

        // Max retries exceeded — error emitted
        assertEquals(PollError.MaxRetriesExceeded, holder.error.value)
    }

    @Test
    fun `terminal errors are not retried`() = runTest {
        var attempts = 0
        val holder = RoomStateHolder(
            fetchState = {
                attempts++
                throw PollException.Terminal("Not found")
            },
            activeIntervalMs = 50L,
            scope = backgroundScope,
        )

        holder.startPolling("TEST01")
        runCurrent()
        assertEquals(1, attempts)

        // Advance past any possible retry window
        advanceTimeBy(5000)
        runCurrent()
        assertEquals(1, attempts) // no retries

        val error = holder.error.value
        assertIs<PollError.Terminal>(error)
    }

    @Test
    fun `successful fetch clears error state and resumes polling`() = runTest {
        var attempts = 0
        val holder = RoomStateHolder(
            fetchState = {
                attempts++
                if (attempts <= 2) throw Exception("Temporary failure")
                else dev.johnoreilly.whatnext.mobile.network.RoomState(
                    roomId = "TEST01", storyLine = "test", players = listOf("Alice"),
                    scores = emptyMap(), turn = 1, phase = "lobby", storyHistory = emptyList(),
                    maxTurns = 10, playerInputs = emptyList(),
                )
            },
            activeIntervalMs = 50L,
            scope = backgroundScope,
        )

        holder.startPolling("TEST01")
        runCurrent()
        assertEquals(1, attempts)
        assertEquals(PollError.Retryable::class, holder.error.value?.let { it::class })

        advanceTimeBy(500)
        runCurrent()
        assertEquals(2, attempts)

        advanceTimeBy(1000)
        runCurrent()
        assertEquals(3, attempts) // third attempt succeeds
        assertEquals(null, holder.error.value) // error cleared
        assertEquals("lobby", holder.state.value?.phase ?: "")
    }

    @Test
    fun `polling resumes after successful retry`() = runTest {
        var attempts = 0
        val holder = RoomStateHolder(
            fetchState = {
                attempts++
                if (attempts == 1) throw Exception("fail")
                else dev.johnoreilly.whatnext.mobile.network.RoomState(
                    roomId = "T", storyLine = "", players = listOf("A"),
                    scores = emptyMap(), turn = 1, phase = "voting", storyHistory = emptyList(),
                    maxTurns = 10, playerInputs = emptyList(),
                )
            },
            activeIntervalMs = 50L,
            scope = backgroundScope,
        )

        holder.startPolling("TEST01")
        runCurrent()
        assertEquals(1, attempts)

        // Successful retry after 500ms
        advanceTimeBy(500)
        runCurrent()
        assertEquals(2, attempts)
        assertEquals("voting", holder.state.value?.phase)

        // Normal polling resumes at active interval
        advanceTimeBy(60)
        runCurrent()
        assertEquals(3, attempts)
    }
}
