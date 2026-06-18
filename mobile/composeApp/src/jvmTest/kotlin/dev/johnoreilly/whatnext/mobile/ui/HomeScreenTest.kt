package dev.johnoreilly.whatnext.mobile.ui

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.runComposeUiTest
import dev.johnoreilly.whatnext.mobile.HomeScreen
import dev.johnoreilly.whatnext.mobile.ui.gametheme.GameTheme
import io.github.patrickoreilly.whatnext.mobile.viewmodel.HomeViewModel
import kotlin.test.Test

class HomeScreenTest {

    @OptIn(ExperimentalTestApi::class)
    @Test
    fun `home screen shows title and tagline`() = runComposeUiTest {
        val viewModel = HomeViewModel()
        viewModel.dismissLoading()

        setContent {
            GameTheme {
                HomeScreen(viewModel = viewModel)
            }
        }

        onNodeWithText("What Next?").assertIsDisplayed()
        onNodeWithText("Create Epic Stories with Friends").assertIsDisplayed()
    }

    @OptIn(ExperimentalTestApi::class)
    @Test
    fun `home screen shows action buttons`() = runComposeUiTest {
        val viewModel = HomeViewModel()
        viewModel.dismissLoading()

        setContent {
            GameTheme {
                HomeScreen(viewModel = viewModel)
            }
        }

        onNodeWithText("CREATE ROOM").assertIsDisplayed()
        onNodeWithText("JOIN ROOM").assertIsDisplayed()
    }

    @OptIn(ExperimentalTestApi::class)
    @Test
    fun `home screen shows loading state initially`() = runComposeUiTest {
        val viewModel = HomeViewModel()

        setContent {
            GameTheme {
                HomeScreen(viewModel = viewModel)
            }
        }

        onNodeWithText("Loading…").assertIsDisplayed()
    }
}
