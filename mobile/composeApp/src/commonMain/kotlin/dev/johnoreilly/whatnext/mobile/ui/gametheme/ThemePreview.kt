package dev.johnoreilly.whatnext.mobile.ui.gametheme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ThemePreview() {
    GameTheme {
        val colors = LocalGameColors.current
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .background(colors.surfaceNearBlack)
                .padding(16.dp),
        ) {
            Text(
                text = "GameTheme Preview",
                color = colors.onSurfaceWhite,
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
            )
            Spacer(Modifier.height(24.dp))

            Text("GameBox", color = colors.onSurfaceWhite, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            GameBox {
                Text("Content inside GameBox", color = colors.onSurfaceWhite)
            }

            Spacer(Modifier.height(24.dp))
            Text("GameButton", color = colors.onSurfaceWhite, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            var clicked by remember { mutableStateOf(false) }
            GameButton(onClick = { clicked = !clicked }) {
                Text(
                    if (clicked) "Clicked!" else "Tap Me",
                    color = colors.onSurfaceWhite,
                )
            }

            Spacer(Modifier.height(8.dp))
            GameButton(onClick = {}, enabled = false) {
                Text("Disabled", color = colors.onSurfaceWhite)
            }

            Spacer(Modifier.height(24.dp))
            Text("GameTextField", color = colors.onSurfaceWhite, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            var text by remember { mutableStateOf("") }
            GameTextField(
                value = text,
                onValueChange = { text = it },
                placeholder = "Type something...",
                maxLength = 100,
            )

            Spacer(Modifier.height(24.dp))
            Text("Typography Scale", color = colors.onSurfaceWhite, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text("Display (Black)", color = colors.onSurfaceWhite, fontSize = 20.sp, fontWeight = FontWeight.Black)
            Text("Body (SemiBold)", color = colors.onSurfaceWhite, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Text("Code (Monospace)", color = colors.onSurfaceWhite, fontSize = 14.sp, fontFamily = FontFamily.Monospace)
        }
    }
}
