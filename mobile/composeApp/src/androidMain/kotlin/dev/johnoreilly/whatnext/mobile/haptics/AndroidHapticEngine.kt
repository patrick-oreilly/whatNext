package dev.johnoreilly.whatnext.mobile.haptics

import android.view.HapticFeedbackConstants
import android.view.View

class AndroidHapticEngine(private val view: View) : HapticEngine {
    override fun buzz() {
        view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }
}
