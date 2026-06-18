package dev.johnoreilly.whatnext.mobile.ui

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.runComposeUiTest
import dev.johnoreilly.whatnext.mobile.JoinRoomScreen
import dev.johnoreilly.whatnext.mobile.network.JoinRoomResponse
import dev.johnoreilly.whatnext.mobile.ui.gametheme.GameTheme
import io.github.patrickoreilly.whatnext.mobile.viewmodel.JoinRoomViewModel
import kotlin.test.Test

class JoinRoomScreenTest {

    @OptIn(ExperimentalTestApi::class)
    @Test
    fun `join room screen shows heading and inputs`() = runComposeUiTest {
        val viewModel = JoinRoomViewModel(
            joinRoom = { _: String, _: String -> throw Exception("Not called") },
        )

        setContent {
            GameTheme {
                JoinRoomScreen(viewModel = viewModel)
            }
        }

        onNodeWithText("JOIN GAME").assertIsDisplayed()
        onNodeWithText("YOUR NAME").assertIsDisplayed()
        onNodeWithText("ROOM CODE").assertIsDisplayed()
    }

    @OptIn(ExperimentalTestApi::class)
    @Test
    fun `join room screen shows action buttons`() = runComposeUiTest {
        val viewModel = JoinRoomViewModel(
            joinRoom = { _: String, _: String -> throw Exception("Not called") },
        )

        setContent {
            GameTheme {
                JoinRoomScreen(viewModel = viewModel)
            }
        }

        onNodeWithText("CANCEL").assertIsDisplayed()
        onNodeWithText("JOIN ROOM").assertIsDisplayed()
    }

    @OptIn(ExperimentalTestApi::class)
    @Test
    fun `join room screen shows helper text`() = runComposeUiTest {
        val viewModel = JoinRoomViewModel(
            joinRoom = { _: String, _: String -> throw Exception("Not called") },
        )

        setContent {
            GameTheme {
                JoinRoomScreen(viewModel = viewModel)
            }
        }

        onNodeWithText("ASK THE HOST FOR THE ROOM CODE").assertIsDisplayed()
    }
}
