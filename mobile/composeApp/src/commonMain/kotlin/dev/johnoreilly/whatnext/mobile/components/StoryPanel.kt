package dev.johnoreilly.whatnext.mobile.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mikepenz.markdown.m3.Markdown
import com.mikepenz.markdown.m3.markdownColor
import dev.johnoreilly.whatnext.mobile.UiDefaults
import dev.johnoreilly.whatnext.mobile.network.RoomState

@Composable
internal fun StoryPanel(
    state: RoomState,
    inputText: String,
    onInputChange: (String) -> Unit,
    submitting: Boolean,
    submitError: String?,
    onSubmit: () -> Unit,
) {
    Panel(title = "STORYLINE & HISTORY") {
        // Render the current storyline (Markdown)
//        if (state.storyLine.isNotBlank()) {
//            Markdown(state.storyLine, colors = markdownColor(text = Color.White))
//            Spacer(Modifier.height(16.dp))
//        }

        // Submit input box under storyline
        Column(Modifier.fillMaxWidth()) {
            // Show the latest story turn (paragraph and decision) above the input field (if available)
            val lastTurn = state.storyHistory.lastOrNull()
            if (lastTurn != null) {
                Markdown(content = lastTurn.content.paragraph, colors = markdownColor(text = Color.White))
                if (!lastTurn.content.decision.isNullOrBlank()) {
                    Spacer(Modifier.height(6.dp))
                    Text("Decision: ${lastTurn.content.decision}", color = Color(0xFFE5E7EB))
                }
                Spacer(Modifier.height(8.dp))
            }
            OutlinedTextField(
                value = inputText,
                onValueChange = { onInputChange(it) },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Type your input for the story…") },
                minLines = 3,
                maxLines = 6,
                enabled = !submitting,
                colors = UiDefaults.outlinedTextFieldColors(),
            )
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Spacer(Modifier.weight(1f))
                Button(
                    onClick = onSubmit,
                    enabled = inputText.isNotBlank() && !submitting,
                    colors = UiDefaults.primaryButtonColors(),
                ) {
                    Text(if (submitting) "SUBMITTING…" else "SUBMIT")
                }
            }
            if (!submitError.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(submitError, color = Color(0xFFFFB4AB))
            }
            // Show current player inputs only during voting phase
            if (state.phase == "voting" && state.playerInputs.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                Column(Modifier.fillMaxWidth()) {
                    Text("Player inputs", color = Color(0xFFF97316), fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(6.dp))
                    state.playerInputs.forEach { pi ->
                        Text("• ${pi.playerName}: ${pi.text}", color = Color(0xFFE5E7EB))
                    }
                }
            }
        }
        
        Spacer(Modifier.height(16.dp))

        // Render history (excluding the latest turn which is shown above)
        val historyExcludingLatest = state.storyHistory.dropLast(1)
        if (historyExcludingLatest.isEmpty()) {
            Text("No story history yet", color = Color(0xFFE5E7EB))
        } else {
            historyExcludingLatest.asReversed().forEach { st ->
                TurnEntry(turn = st.turn, paragraph = st.content.paragraph, decision = st.content.decision)
                Spacer(Modifier.height(12.dp))
            }
        }
    }
}

@Composable
internal fun TurnEntry(turn: Int, paragraph: String, decision: String?) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .width(4.dp)
                .height(IntrinsicSize.Min)
                .background(Color(0xFFF97316))
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("TURN $turn", color = Color(0xFFF97316), fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(4.dp))
            Markdown(content = paragraph, colors = markdownColor(text = Color.White))
            if (!decision.isNullOrBlank()) {
                Spacer(Modifier.height(6.dp))
                Text("Decision: $decision", color = Color(0xFFE5E7EB))
            }
        }
    }
}