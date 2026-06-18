package io.github.patrickoreilly.whatnext.mobile.navigation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString

class NavRoutesTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `Home route serializes and deserializes correctly`() {
        val route: Route = Route.Home
        val encoded = json.encodeToString(route)
        val decoded = json.decodeFromString<Route>(encoded)
        assertEquals(Route.Home, decoded)
    }

    @Test
    fun `CreateRoom route round-trips through serialization`() {
        val encoded = json.encodeToString<Route>(Route.CreateRoom)
        assertEquals(Route.CreateRoom, json.decodeFromString<Route>(encoded))
    }

    @Test
    fun `JoinRoom route round-trips through serialization`() {
        val encoded = json.encodeToString<Route>(Route.JoinRoom)
        assertEquals(Route.JoinRoom, json.decodeFromString<Route>(encoded))
    }

    @Test
    fun `Lobby route preserves roomId through serialization round-trip`() {
        val route: Route = Route.Lobby(roomId = "ABC123")
        val encoded = json.encodeToString(route)
        val decoded = json.decodeFromString<Route>(encoded)
        assertEquals(Route.Lobby("ABC123"), decoded)
    }

    @Test
    fun `Game route preserves roomId through serialization round-trip`() {
        val route: Route = Route.Game(roomId = "XYZ789")
        val encoded = json.encodeToString(route)
        val decoded = json.decodeFromString<Route>(encoded)
        assertEquals(Route.Game("XYZ789"), decoded)
    }

    @Test
    fun `GameOver route preserves roomId through serialization round-trip`() {
        val route: Route = Route.GameOver(roomId = "FOOBAR")
        val encoded = json.encodeToString(route)
        val decoded = json.decodeFromString<Route>(encoded)
        assertEquals(Route.GameOver("FOOBAR"), decoded)
    }

    @Test
    fun `all six routes are distinct and each round-trips independently`() {
        val routes = listOf(
            Route.Home,
            Route.CreateRoom,
            Route.JoinRoom,
            Route.Lobby("AAAAAA"),
            Route.Game("BBBBBB"),
            Route.GameOver("CCCCCC"),
        )
        val encoded = routes.map { json.encodeToString(it) }
        val decoded = encoded.map { json.decodeFromString<Route>(it) }

        assertEquals(routes, decoded)
    }
}
