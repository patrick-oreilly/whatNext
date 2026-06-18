package dev.johnoreilly.whatnext.mobile.ui.gametheme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

data class GameColors(
    val primaryOrange: Color,
    val surfaceNearBlack: Color,
    val onSurfaceWhite: Color,
    val borderBlack: Color,
) {
    companion object {
        val Default = GameColors(
            primaryOrange = Color(0xFFFF5722),
            surfaceNearBlack = Color(0xFF0A0A0A),
            onSurfaceWhite = Color(0xFFFFFFFF),
            borderBlack = Color(0xFF000000),
        )
    }
}

data class GameTypography(
    val displayFont: FontFamily,
    val displayWeight: FontWeight,
    val bodyFont: FontFamily,
    val bodyWeight: FontWeight,
    val codeFont: FontFamily,
) {
    companion object {
        val Default = GameTypography(
            displayFont = FontFamily.Default,
            displayWeight = FontWeight.Black,
            bodyFont = FontFamily.Default,
            bodyWeight = FontWeight.SemiBold,
            codeFont = FontFamily.Monospace,
        )
    }
}

data class GameShapes(
    val borderWidth: Dp,
) {
    companion object {
        val Default = GameShapes(
            borderWidth = 4.dp,
        )
    }
}
