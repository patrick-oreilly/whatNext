package dev.johnoreilly.whatnext.mobile.ui.home

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import dev.johnoreilly.whatnext.mobile.HomeScreen
import dev.johnoreilly.whatnext.mobile.ui.gametheme.GameTheme
import io.github.patrickoreilly.whatnext.mobile.viewmodel.HomeViewModel
import org.junit.Rule
import org.junit.Test

class HomeScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `home screen shows title and tagline`() {
        val viewModel = HomeViewModel()
        viewModel.dismissLoading()

        composeTestRule.setContent {
            GameTheme {
                HomeScreen(viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithText("What Next?").assertIsDisplayed()
        composeTestRule.onNodeWithText("Create Epic Stories with Friends").assertIsDisplayed()
    }

    @Test
    fun `home screen shows How to Play section`() {
        val viewModel = HomeViewModel()
        viewModel.dismissLoading()

        composeTestRule.setContent {
            GameTheme {
                HomeScreen(viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithText("HOW TO PLAY").assertIsDisplayed()
        composeTestRule.onNodeWithText("1").assertIsDisplayed()
        composeTestRule.onNodeWithText("CHOOSE STORY").assertIsDisplayed()
    }

    @Test
    fun `home screen shows action buttons`() {
        val viewModel = HomeViewModel()
        viewModel.dismissLoading()

        composeTestRule.setContent {
            GameTheme {
                HomeScreen(viewModel = viewModel)
            }
        }

        composeTestRule.onNodeWithText("CREATE ROOM").assertIsDisplayed()
        composeTestRule.onNodeWithText("JOIN ROOM").assertIsDisplayed()
    }
}
