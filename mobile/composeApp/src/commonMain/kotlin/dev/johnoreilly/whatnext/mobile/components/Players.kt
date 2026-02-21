package dev.johnoreilly.whatnext.mobile.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

@Composable
internal fun PlayersPanel(players: List<String>, scores: Map<String, Int>) {
    Panel(title = "PLAYERS") {
        if (players.isEmpty()) {
            Text("No players in this room", color = Color(0xFFE5E7EB))
        } else {
            players.forEachIndexed { index, name ->
                val score = scores[name] ?: 0
                PlayerRow(index + 1, name, score)
                if (index != players.lastIndex) Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
internal fun PlayerRow(number: Int, name: String, score: Int) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .size(28.dp)
                .background(Color(0xFFF97316), RoundedCornerShape(14.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text("$number", color = Color.Black, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.width(12.dp))
        Text(name, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Spacer(Modifier.weight(1f))
        ScoreBadge(score)
    }
}

@Composable
internal fun ScoreBadge(score: Int) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0B0F19)),
        border = BorderStroke(1.dp, Color(0xFFF5F5F4)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Text(
            text = "$score",
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            color = Color(0xFFF5F5F4)
        )
    }
}