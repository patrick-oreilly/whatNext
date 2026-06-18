package dev.johnoreilly.whatnext.mobile.haptics

import platform.UIKit.UIImpactFeedbackGenerator
import platform.UIKit.UIImpactFeedbackStyle

class IosHapticEngine : HapticEngine {
    private val generator = UIImpactFeedbackGenerator(style = UIImpactFeedbackStyle.UIImpactFeedbackStyleMedium)

    override fun buzz() {
        generator.impactOccurred()
    }
}
