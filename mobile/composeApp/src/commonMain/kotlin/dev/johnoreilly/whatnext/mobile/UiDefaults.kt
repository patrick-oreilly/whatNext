package dev.johnoreilly.whatnext.mobile

import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * Centralized UI defaults to keep Compose configuration consistent across components.
 */
internal object UiDefaults {
    @Composable
    fun outlinedTextFieldColors() = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = Color.White,
        unfocusedContainerColor = Color.White,
        focusedTextColor = Color(0xFF111827),
        unfocusedTextColor = Color(0xFF111827),
        focusedBorderColor = Color(0xFFF59E0B),
        unfocusedBorderColor = Color(0xFFF59E0B),
        disabledBorderColor = Color(0xFFF59E0B),
        focusedPlaceholderColor = Color(0xFF9CA3AF),
        unfocusedPlaceholderColor = Color(0xFF9CA3AF),
    )

    @Composable
    fun primaryButtonColors() = ButtonDefaults.buttonColors(
        containerColor = Color.White,
        contentColor = Color.Black,
    )
}