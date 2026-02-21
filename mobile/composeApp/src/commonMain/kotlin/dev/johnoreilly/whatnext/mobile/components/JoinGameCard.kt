package dev.johnoreilly.whatnext.mobile.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.johnoreilly.whatnext.mobile.UiDefaults

@Composable
internal fun JoinGameCard(
    name: String,
    roomCode: String,
    onNameChange: (String) -> Unit,
    onRoomCodeChange: (String) -> Unit,
    loading: Boolean,
    error: String?,
    onCancel: () -> Unit,
    onJoin: () -> Unit,
    onRejoin: () -> Unit,
) {
    val border = BorderStroke(3.dp, Color(0xFFF5F5F4))
    Card(
        shape = RoundedCornerShape(16.dp),
        border = border,
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0B0F19)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.fillMaxWidth().padding(20.dp)) {
            // Title
            Text(
                text = "JOIN GAME",
                color = Color.White,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Black,
            )
            Spacer(Modifier.height(20.dp))

            // Name field
            Text("YOUR NAME", color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = name,
                onValueChange = { onNameChange(it) },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Enter your name") },
                singleLine = true,
                colors = UiDefaults.outlinedTextFieldColors(),
            )

            Spacer(Modifier.height(20.dp))

            // Room code field
            Text("ROOM CODE", color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = roomCode,
                onValueChange = { input ->
                    val sanitized = input.uppercase().filter { it.isLetterOrDigit() }.take(6)
                    onRoomCodeChange(sanitized)
                },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Enter 6-character code") },
                singleLine = true,
                colors = UiDefaults.outlinedTextFieldColors(),
            )
            Spacer(Modifier.height(8.dp))
            Text("ASK THE HOST FOR THE ROOM CODE", color = Color(0xFFE5E7EB))

            if (!error.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(error, color = Color(0xFFFFB4AB))
            }

            Spacer(Modifier.height(20.dp))
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(
                    onClick = onCancel,
                    enabled = !loading,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("CANCEL")
                }
                Spacer(Modifier.width(16.dp))
                OutlinedButton(
                    onClick = onRejoin,
                    enabled = !loading && name.isNotBlank() && roomCode.length == 6,
                    modifier = Modifier.weight(1f),
                    colors = UiDefaults.primaryButtonColors(),
                ) {
                    Text(if (loading) "REJOINING…" else "REJOIN")
                }
                Spacer(Modifier.width(16.dp))
                Button(
                    onClick = onJoin,
                    enabled = !loading && name.isNotBlank() && roomCode.length == 6,
                    modifier = Modifier.weight(1f),
                    colors = UiDefaults.primaryButtonColors(),
                ) {
                    Text(if (loading) "JOINING…" else "JOIN ROOM")
                }
            }
        }
    }
}