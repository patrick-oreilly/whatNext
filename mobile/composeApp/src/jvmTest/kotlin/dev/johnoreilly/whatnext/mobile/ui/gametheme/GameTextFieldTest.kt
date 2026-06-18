package dev.johnoreilly.whatnext.mobile.ui.gametheme

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.runComposeUiTest
import kotlin.test.Test
import kotlin.test.assertEquals

class GameTextFieldTest {

    @OptIn(ExperimentalTestApi::class)
    @Test
    fun `GameTextField renders with placeholder and initial value`() = runComposeUiTest {
        var text by mutableStateOf("Initial")
        setContent {
            GameTheme {
                GameTextField(
                    value = text,
                    onValueChange = { text = it },
                    placeholder = "Type here",
                )
            }
        }
        runOnIdle {
            assertEquals("Initial", text)
        }
    }

    @OptIn(ExperimentalTestApi::class)
    @Test
    fun `GameTextField shows character count when maxLength set`() = runComposeUiTest {
        var text by mutableStateOf("Hello")
        setContent {
            GameTheme {
                GameTextField(
                    value = text,
                    onValueChange = { text = it },
                    placeholder = "Write",
                    maxLength = 50,
                )
            }
        }
        onNodeWithText("5 / 50").assertExists()
    }
}
