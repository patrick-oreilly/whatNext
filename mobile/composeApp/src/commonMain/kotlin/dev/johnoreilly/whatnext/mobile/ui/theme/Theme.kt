package dev.johnoreilly.whatnext.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// NOTE: These are approximations of the web app palette.
// If you have exact tokens, we can refine these values quickly.

private val LightPrimary = Color(0xFF6D28D9) // violet-700
private val LightOnPrimary = Color(0xFFFFFFFF)
private val LightPrimaryContainer = Color(0xFFE9D5FF)
private val LightOnPrimaryContainer = Color(0xFF24005A)

private val LightSecondary = Color(0xFF14B8A6) // teal-500
private val LightOnSecondary = Color(0xFF00201C)
private val LightSecondaryContainer = Color(0xFF99F6E4)
private val LightOnSecondaryContainer = Color(0xFF00201C)

private val LightTertiary = Color(0xFFF59E0B) // amber-500
private val LightOnTertiary = Color(0xFF1F1400)
private val LightTertiaryContainer = Color(0xFFFDE68A)
private val LightOnTertiaryContainer = Color(0xFF221900)

private val LightBackground = Color(0xFFF8FAFC) // slate-50
private val LightOnBackground = Color(0xFF0F172A) // slate-900
private val LightSurface = Color(0xFFFFFFFF)
private val LightOnSurface = Color(0xFF0F172A)
private val LightSurfaceVariant = Color(0xFFE5E7EB) // gray-200
private val LightOnSurfaceVariant = Color(0xFF334155) // slate-700
private val LightOutline = Color(0xFF94A3B8) // slate-400
private val LightError = Color(0xFFBA1A1A)
private val LightOnError = Color(0xFFFFFFFF)

private val DarkPrimary = Color(0xFFC4B5FD) // violet-300
private val DarkOnPrimary = Color(0xFF2E1065)
private val DarkPrimaryContainer = Color(0xFF4C1D95)
private val DarkOnPrimaryContainer = Color(0xFFEDE9FE)

private val DarkSecondary = Color(0xFF2DD4BF)
private val DarkOnSecondary = Color(0xFF042F2E)
private val DarkSecondaryContainer = Color(0xFF134E4A)
private val DarkOnSecondaryContainer = Color(0xFFCCFBF1)

private val DarkTertiary = Color(0xFFFBBF24)
private val DarkOnTertiary = Color(0xFF1F1400)
private val DarkTertiaryContainer = Color(0xFF713F12)
private val DarkOnTertiaryContainer = Color(0xFFFEF3C7)

private val DarkBackground = Color(0xFF0F172A) // slate-900
private val DarkOnBackground = Color(0xFFE2E8F0) // slate-200
private val DarkSurface = Color(0xFF111827) // gray-900
private val DarkOnSurface = Color(0xFFE5E7EB) // gray-200
private val DarkSurfaceVariant = Color(0xFF1F2937) // gray-800
private val DarkOnSurfaceVariant = Color(0xFFCBD5E1) // slate-300
private val DarkOutline = Color(0xFF475569) // slate-600
private val DarkError = Color(0xFFFFB4AB)
private val DarkOnError = Color(0xFF690005)

private val WhatNextLightColors: ColorScheme = lightColorScheme(
    primary = LightPrimary,
    onPrimary = LightOnPrimary,
    primaryContainer = LightPrimaryContainer,
    onPrimaryContainer = LightOnPrimaryContainer,
    secondary = LightSecondary,
    onSecondary = LightOnSecondary,
    secondaryContainer = LightSecondaryContainer,
    onSecondaryContainer = LightOnSecondaryContainer,
    tertiary = LightTertiary,
    onTertiary = LightOnTertiary,
    tertiaryContainer = LightTertiaryContainer,
    onTertiaryContainer = LightOnTertiaryContainer,
    background = LightBackground,
    onBackground = LightOnBackground,
    surface = LightSurface,
    onSurface = LightOnSurface,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightOnSurfaceVariant,
    outline = LightOutline,
    error = LightError,
    onError = LightOnError,
)

private val WhatNextDarkColors: ColorScheme = darkColorScheme(
    primary = DarkPrimary,
    onPrimary = DarkOnPrimary,
    primaryContainer = DarkPrimaryContainer,
    onPrimaryContainer = DarkOnPrimaryContainer,
    secondary = DarkSecondary,
    onSecondary = DarkOnSecondary,
    secondaryContainer = DarkSecondaryContainer,
    onSecondaryContainer = DarkOnSecondaryContainer,
    tertiary = DarkTertiary,
    onTertiary = DarkOnTertiary,
    tertiaryContainer = DarkTertiaryContainer,
    onTertiaryContainer = DarkOnTertiaryContainer,
    background = DarkBackground,
    onBackground = DarkOnBackground,
    surface = DarkSurface,
    onSurface = DarkOnSurface,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkOnSurfaceVariant,
    outline = DarkOutline,
    error = DarkError,
    onError = DarkOnError,
)

@Composable
fun WhatNextTheme(
    useDarkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (useDarkTheme) WhatNextDarkColors else WhatNextLightColors
    MaterialTheme(
        colorScheme = colors,
        content = content
    )
}
