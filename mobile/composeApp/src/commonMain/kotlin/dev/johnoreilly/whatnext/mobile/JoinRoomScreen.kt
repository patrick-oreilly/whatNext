package dev.johnoreilly.whatnext.mobile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.johnoreilly.whatnext.mobile.ui.gametheme.GameBox
import dev.johnoreilly.whatnext.mobile.ui.gametheme.GameButton
import dev.johnoreilly.whatnext.mobile.ui.gametheme.GameTextField
import dev.johnoreilly.whatnext.mobile.ui.gametheme.LocalGameColors
import dev.johnoreilly.whatnext.mobile.ui.gametheme.LocalGameTypography
import io.github.patrickoreilly.whatnext.mobile.viewmodel.JoinRoomEvent
import io.github.patrickoreilly.whatnext.mobile.viewmodel.JoinRoomViewModel
import kotlinx.coroutines.launch

@Composable
fun JoinRoomScreen(
    viewModel: JoinRoomViewModel,
    onCancel: () -> Unit = {},
    onJoined: (roomId: String) -> Unit = {},
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = LocalGameColors.current
    val typography = LocalGameTypography.current
    val scrollState = rememberScrollState()
    val scope = rememberCoroutineScope()

    // Handle navigation events
    LaunchedEffect(Unit) {
        viewModel.navigationEvent.collect { event ->
            when (event) {
                is JoinRoomEvent.NavigateToLobby -> onJoined(event.roomId)
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.surfaceNearBlack)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .verticalScroll(scrollState)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(40.dp))

            // Heading
            Text(
                text = "JOIN GAME",
                fontFamily = typography.displayFont,
                fontWeight = typography.displayWeight,
                fontSize = 36.sp,
                color = colors.onSurfaceWhite,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(32.dp))

            GameBox(modifier = Modifier.fillMaxWidth()) {
                Column {
                    // Player name field
                    Text(
                        text = "YOUR NAME",
                        fontWeight = FontWeight.Bold,
                        color = colors.onSurfaceWhite,
                        fontSize = 14.sp,
                    )
                    Spacer(Modifier.height(8.dp))
                    GameTextField(
                        value = uiState.playerName,
                        onValueChange = { viewModel.playerName = it },
                        placeholder = "Enter your name",
                        maxLength = 20,
                    )
                    if (uiState.playerNameError != null) {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = uiState.playerNameError!!,
                            color = Color(0xFFFFB4AB),
                            fontSize = 13.sp,
                        )
                    }

                    Spacer(Modifier.height(20.dp))

                    // Room code field
                    Text(
                        text = "ROOM CODE",
                        fontWeight = FontWeight.Bold,
                        color = colors.onSurfaceWhite,
                        fontSize = 14.sp,
                    )
                    Spacer(Modifier.height(8.dp))
                    GameTextField(
                        value = uiState.roomCode,
                        onValueChange = { viewModel.roomCode = it.uppercase() },
                        placeholder = "Enter 6-character code",
                        maxLength = 6,
                    )
                    Text(
                        text = "ASK THE HOST FOR THE ROOM CODE",
                        color = colors.onSurfaceWhite.copy(alpha = 0.6f),
                        fontSize = 12.sp,
                    )
                    if (uiState.roomCodeError != null) {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = uiState.roomCodeError!!,
                            color = Color(0xFFFFB4AB),
                            fontSize = 13.sp,
                        )
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // Buttons
            Row(modifier = Modifier.fillMaxWidth()) {
                GameButton(
                    onClick = onCancel,
                    modifier = Modifier.weight(1f),
                    enabled = !uiState.isLoading,
                ) {
                    Text(
                        "CANCEL",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                    )
                }

                Spacer(Modifier.width(16.dp))

                GameButton(
                    onClick = {
                        scope.launch { viewModel.join() }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = !uiState.isLoading,
                ) {
                    Text(
                        if (uiState.isLoading) "JOINING…" else "JOIN ROOM",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                    )
                }
            }
        }
    }
}
