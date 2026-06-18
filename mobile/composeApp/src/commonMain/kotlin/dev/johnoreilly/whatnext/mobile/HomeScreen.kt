package dev.johnoreilly.whatnext.mobile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.johnoreilly.whatnext.mobile.ui.gametheme.GameBox
import dev.johnoreilly.whatnext.mobile.ui.gametheme.GameButton
import dev.johnoreilly.whatnext.mobile.ui.gametheme.LocalGameColors
import dev.johnoreilly.whatnext.mobile.ui.gametheme.LocalGameTypography
import io.github.patrickoreilly.whatnext.mobile.viewmodel.HomeViewModel

@Composable
fun HomeScreen(
    viewModel: HomeViewModel = remember { HomeViewModel() },
    onCreateRoom: () -> Unit = {},
    onJoinRoom: () -> Unit = {},
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = LocalGameColors.current
    val typography = LocalGameTypography.current
    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFFF470D),
                        Color(0xFFFF6B35),
                        Color(0xFFFF8B55),
                    )
                )
            )
    ) {
        if (uiState.isLoading) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .systemBarsPadding(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                CircularProgressIndicator(color = Color.White)
                Spacer(Modifier.height(16.dp))
                Text("Loading…", color = Color.White)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .systemBarsPadding()
                    .verticalScroll(scrollState)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Spacer(Modifier.height(40.dp))

                // Title
                Text(
                    text = "What Next?",
                    fontFamily = typography.displayFont,
                    fontWeight = typography.displayWeight,
                    fontSize = 56.sp,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                )

                Spacer(Modifier.height(8.dp))

                // Tagline
                Text(
                    text = "Create Epic Stories with Friends",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                )

                Spacer(Modifier.height(48.dp))

                // Action buttons
                GameButton(
                    onClick = onCreateRoom,
                    modifier = Modifier.widthIn(max = 320.dp),
                ) {
                    Text(
                        "CREATE ROOM",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                    )
                }

                Spacer(Modifier.height(16.dp))

                GameButton(
                    onClick = onJoinRoom,
                    modifier = Modifier.widthIn(max = 320.dp),
                ) {
                    Text(
                        "JOIN ROOM",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                    )
                }

                Spacer(Modifier.height(48.dp))

                // How to Play section
                Text(
                    text = "HOW TO PLAY",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                )

                Spacer(Modifier.height(24.dp))

                HowToPlayCard(
                    stepNumber = "1",
                    title = "Choose Story",
                    description = "Select from Hoop Dreams, Space, Heist, or Haunted Mansion",
                    colors = colors,
                )

                Spacer(Modifier.height(16.dp))

                HowToPlayCard(
                    stepNumber = "2",
                    title = "Write & Vote",
                    description = "Submit ideas, vote for your favorite",
                    colors = colors,
                )

                Spacer(Modifier.height(16.dp))

                HowToPlayCard(
                    stepNumber = "3",
                    title = "AI Magic",
                    description = "Watch AI weave winning ideas into epic stories",
                    colors = colors,
                )
            }
        }
    }
}

@Composable
private fun HowToPlayCard(
    stepNumber: String,
    title: String,
    description: String,
    colors: dev.johnoreilly.whatnext.mobile.ui.gametheme.GameColors,
) {
    GameBox(modifier = Modifier.fillMaxWidth()) {
        Column {
            Text(
                text = stepNumber,
                fontSize = 32.sp,
                fontWeight = FontWeight.Black,
                color = colors.primaryOrange,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = title.uppercase(),
                fontWeight = FontWeight.Black,
                color = colors.onSurfaceWhite,
                fontSize = 18.sp,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = description,
                fontWeight = FontWeight.SemiBold,
                color = colors.onSurfaceWhite.copy(alpha = 0.8f),
                fontSize = 14.sp,
            )
        }
    }
}
