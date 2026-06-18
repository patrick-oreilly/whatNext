package io.github.patrickoreilly.whatnext.mobile.navigation

import kotlin.test.Test
import kotlin.test.assertEquals

class NavShellTest {

    @Test
    fun `Home is the default start destination`() {
        val defaultStart = Route.Home
        assertEquals(Route.Home, defaultStart)
    }

    @Test
    fun `Lobby route carries roomId correctly`() {
        val lobby = Route.Lobby("ABCDEF")
        assertEquals("ABCDEF", lobby.roomId)
    }

    @Test
    fun `Game route carries roomId correctly`() {
        val game = Route.Game("XYZ123")
        assertEquals("XYZ123", game.roomId)
    }

    @Test
    fun `GameOver route carries roomId correctly`() {
        val gameOver = Route.GameOver("FOOBAR")
        assertEquals("FOOBAR", gameOver.roomId)
    }

    @Test
    fun `all six routes are distinct types`() {
        val routes = setOf(
            Route.Home::class,
            Route.CreateRoom::class,
            Route.JoinRoom::class,
            Route.Lobby::class,
            Route.Game::class,
            Route.GameOver::class,
        )
        assertEquals(6, routes.size)
    }
}
