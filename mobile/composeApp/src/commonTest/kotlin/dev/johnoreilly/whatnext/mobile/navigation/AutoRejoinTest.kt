package io.github.patrickoreilly.whatnext.mobile.navigation

import io.github.patrickoreilly.whatnext.mobile.settings.CredentialStore
import io.github.patrickoreilly.whatnext.mobile.settings.InMemorySettings
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull

class AutoRejoinTest {
    private val settings = InMemorySettings()

    private fun fakeRoomState(phase: String = "lobby", roomId: String = "ABCDEF") =
        dev.johnoreilly.whatnext.mobile.network.RoomState(
            roomId = roomId, storyLine = "test", players = listOf("Alice"),
            scores = emptyMap(), turn = 1, phase = phase, storyHistory = emptyList(),
            maxTurns = 10, playerInputs = emptyList(),
        )

    @Test
    fun `returns NoCredentials when no persisted credentials exist`() = runTest {
        val store = CredentialStore(settings)
        store.clear()

        val result = resolveAutoRejoin(store) { fakeRoomState() }

        assertIs<AutoRejoinResult.NoCredentials>(result)
    }

    @Test
    fun `navigates to Lobby when valid credentials exist and phase is lobby`() = runTest {
        val store = CredentialStore(settings)
        store.playerToken = "tok_abc"
        store.playerName = "Alice"
        store.roomId = "ABCDEF"

        val result = resolveAutoRejoin(store) { fakeRoomState(phase = "lobby", roomId = "ABCDEF") }

        assertIs<AutoRejoinResult.NavigateTo>(result)
        assertEquals(Route.Lobby("ABCDEF"), (result as AutoRejoinResult.NavigateTo).route)
    }

    @Test
    fun `navigates to Game when valid credentials exist and phase is active`() = runTest {
        val store = CredentialStore(settings)
        store.playerToken = "tok_abc"
        store.playerName = "Alice"
        store.roomId = "ABCDEF"

        val result = resolveAutoRejoin(store) { fakeRoomState(phase = "player_input", roomId = "ABCDEF") }

        assertIs<AutoRejoinResult.NavigateTo>(result)
        assertEquals(Route.Game("ABCDEF"), (result as AutoRejoinResult.NavigateTo).route)
    }

    @Test
    fun `navigates to Game when phase is voting`() = runTest {
        val store = CredentialStore(settings)
        store.playerToken = "tok_abc"
        store.playerName = "Alice"
        store.roomId = "ABCDEF"

        val result = resolveAutoRejoin(store) { fakeRoomState(phase = "voting", roomId = "ABCDEF") }

        assertIs<AutoRejoinResult.NavigateTo>(result)
        assertEquals(Route.Game("ABCDEF"), (result as AutoRejoinResult.NavigateTo).route)
    }

    @Test
    fun `navigates to Game when phase is generating_story`() = runTest {
        val store = CredentialStore(settings)
        store.playerToken = "tok_abc"
        store.playerName = "Alice"
        store.roomId = "ABCDEF"

        val result = resolveAutoRejoin(store) { fakeRoomState(phase = "generating_story", roomId = "ABCDEF") }

        assertIs<AutoRejoinResult.NavigateTo>(result)
        assertEquals(Route.Game("ABCDEF"), (result as AutoRejoinResult.NavigateTo).route)
    }

    @Test
    fun `navigates to GameOver when phase is game_over`() = runTest {
        val store = CredentialStore(settings)
        store.playerToken = "tok_abc"
        store.playerName = "Alice"
        store.roomId = "ABCDEF"

        val result = resolveAutoRejoin(store) { fakeRoomState(phase = "game_over", roomId = "ABCDEF") }

        assertIs<AutoRejoinResult.NavigateTo>(result)
        assertEquals(Route.GameOver("ABCDEF"), (result as AutoRejoinResult.NavigateTo).route)
    }

    @Test
    fun `clears credentials and shows Home when fetch fails`() = runTest {
        val store = CredentialStore(settings)
        store.playerToken = "tok_abc"
        store.playerName = "Alice"
        store.roomId = "ABCDEF"

        val result = resolveAutoRejoin(store) { throw Exception("Network error") }

        assertIs<AutoRejoinResult.ShowHomeWithMessage>(result)
        assertEquals("Your previous session ended. Welcome back!", (result as AutoRejoinResult.ShowHomeWithMessage).message)
        assertNull(store.playerToken)
        assertNull(store.playerName)
        assertNull(store.roomId)
    }

    @Test
    fun `clears credentials when roomId is null even if other creds exist`() = runTest {
        val store = CredentialStore(settings)
        store.playerToken = "tok_abc"
        store.playerName = "Alice"
        store.roomId = null

        val result = resolveAutoRejoin(store) { fakeRoomState() }

        assertIs<AutoRejoinResult.NoCredentials>(result)
    }

    @Test
    fun `clears credentials when playerToken is null`() = runTest {
        val store = CredentialStore(settings)
        store.playerToken = null
        store.playerName = "Alice"
        store.roomId = "ABCDEF"

        val result = resolveAutoRejoin(store) { fakeRoomState() }

        assertIs<AutoRejoinResult.NoCredentials>(result)
    }
}
