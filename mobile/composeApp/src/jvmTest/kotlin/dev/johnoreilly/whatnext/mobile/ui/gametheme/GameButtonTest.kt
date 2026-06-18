package dev.johnoreilly.whatnext.mobile.ui.gametheme

import androidx.compose.material3.Text
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.runComposeUiTest
import dev.johnoreilly.whatnext.mobile.haptics.HapticEngine
import dev.johnoreilly.whatnext.mobile.haptics.LocalHapticEngine
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class GameButtonTest {

    private class TestHapticEngine : HapticEngine {
        var buzzCount = 0
        override fun buzz() { buzzCount++ }
    }

    @OptIn(ExperimentalTestApi::class)
    @Test
    fun `GameButton fires onClick and haptic when clicked`() = runComposeUiTest {
        var clicked = false
        val haptic = TestHapticEngine()
        setContent {
            CompositionLocalProvider(LocalHapticEngine provides haptic) {
                GameTheme {
                    GameButton(onClick = { clicked = true }) {
                        Text("Press Me")
                    }
                }
            }
        }
        onNodeWithText("Press Me").performClick()
        runOnIdle {
            assertTrue(clicked, "onClick should be invoked")
            assertEquals(1, haptic.buzzCount, "haptic should be triggered once")
        }
    }

    @OptIn(ExperimentalTestApi::class)
    @Test
    fun `disabled GameButton does not fire onClick`() = runComposeUiTest {
        var clicked = false
        val haptic = TestHapticEngine()
        setContent {
            CompositionLocalProvider(LocalHapticEngine provides haptic) {
                GameTheme {
                    GameButton(onClick = { clicked = true }, enabled = false) {
                        Text("Disabled")
                    }
                }
            }
        }
        onNodeWithText("Disabled").performClick()
        runOnIdle {
            assertFalse(clicked, "onClick should NOT be invoked when disabled")
            assertEquals(0, haptic.buzzCount, "haptic should NOT be triggered when disabled")
        }
    }
}
