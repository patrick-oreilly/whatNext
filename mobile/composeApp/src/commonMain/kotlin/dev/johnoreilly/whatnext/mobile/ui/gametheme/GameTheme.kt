package dev.johnoreilly.whatnext.mobile.ui.gametheme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf

val LocalGameColors = staticCompositionLocalOf { GameColors.Default }

val LocalGameTypography = staticCompositionLocalOf { GameTypography.Default }

val LocalGameShapes = staticCompositionLocalOf { GameShapes.Default }

@Composable
fun GameTheme(
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(
        LocalGameColors provides GameColors.Default,
        LocalGameTypography provides GameTypography.Default,
        LocalGameShapes provides GameShapes.Default,
        content = content,
    )
}
