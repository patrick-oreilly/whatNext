package dev.johnoreilly.whatnext.mobile.components

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.johnoreilly.whatnext.mobile.network.RoomState

@Composable
internal fun InGameContent(
    state: RoomState,
    inputText: String,
    onInputChange: (String) -> Unit,
    submitting: Boolean,
    submitError: String?,
    onSubmit: () -> Unit,
) {
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val isNarrow = maxWidth < 800.dp
        if (isNarrow) {
            Column {
                StoryPanel(
                    state = state,
                    inputText = inputText,
                    onInputChange = onInputChange,
                    submitting = submitting,
                    submitError = submitError,
                    onSubmit = onSubmit,
                )
                Spacer(Modifier.height(16.dp))
                PlayersPanel(state.players, state.scores)
            }
        } else {
            Row(Modifier.fillMaxWidth()) {
                Column(Modifier.weight(1f)) {
                    StoryPanel(
                        state = state,
                        inputText = inputText,
                        onInputChange = onInputChange,
                        submitting = submitting,
                        submitError = submitError,
                        onSubmit = onSubmit,
                    )
                }
                Spacer(Modifier.width(20.dp))
                Column(Modifier.width(300.dp)) {
                    PlayersPanel(state.players, state.scores)
                }
            }
        }
    }
}