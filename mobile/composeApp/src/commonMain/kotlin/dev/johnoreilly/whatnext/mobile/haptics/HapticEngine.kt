package dev.johnoreilly.whatnext.mobile.haptics

import androidx.compose.runtime.staticCompositionLocalOf

interface HapticEngine {
    fun buzz()
}

val LocalHapticEngine = staticCompositionLocalOf<HapticEngine> {
    object : HapticEngine {
        override fun buzz() {}
    }
}
