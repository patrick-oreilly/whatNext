package dev.johnoreilly.whatnext.mobile.ui.gametheme

import androidx.compose.ui.graphics.Color
import kotlin.test.Test
import kotlin.test.assertEquals

class GameTokensTest {

    @Test
    fun `game colors match the web Tailwind spec`() {
        val colors = GameColors.Default
        assertEquals(Color(0xFFFF5722), colors.primaryOrange)
        assertEquals(Color(0xFF0A0A0A), colors.surfaceNearBlack)
        assertEquals(Color(0xFFFFFFFF), colors.onSurfaceWhite)
        assertEquals(Color(0xFF000000), colors.borderBlack)
    }
}
