package dev.johnoreilly.whatnext.mobile.ui.gametheme

import androidx.compose.material3.Text
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.runComposeUiTest
import kotlin.test.Test

class GameBoxTest {

    @OptIn(ExperimentalTestApi::class)
    @Test
    fun `GameBox renders content`() = runComposeUiTest {
        setContent {
            GameTheme {
                GameBox {
                    Text("Hello from GameBox")
                }
            }
        }
        onNodeWithText("Hello from GameBox").assertExists()
    }
}
