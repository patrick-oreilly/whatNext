package dev.johnoreilly.whatnext.mobile.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.johnoreilly.whatnext.mobile.network.RoomState

/**
 * Displays a simple end-of-game summary and the final scores list.
 */
@Composable
internal fun GameOverContent(
    state: RoomState,
    currentPlayerName: String,
) {
    val playersWithScores = state.players.map { name -> name to (state.scores[name] ?: 0) }
    val ranking = playersWithScores.sortedByDescending { it.second }
    val winner = ranking.firstOrNull()

    // Top summary panel
    Panel {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Trophy + headline
            Text("🏆", fontSize = 42.sp)
            Spacer(Modifier.height(8.dp))
            Text("GAME OVER!", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold)
            if (winner != null) {
                Spacer(Modifier.height(6.dp))
                Text(
                    text = "${winner.first.uppercase()} WINS!",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(4.dp))
                Text(text = "${winner.second} points", color = Color(0xFFE5E7EB))
            }
        }
    }

    Spacer(Modifier.height(16.dp))

    // Final scores panel
    Panel(title = "FINAL SCORES") {
        if (ranking.isEmpty()) {
            Text("No players", color = Color(0xFFE5E7EB))
        } else {
            ranking.forEachIndexed { index, (name, score) ->
                val isWinner = index == 0
                FinalScoreRow(
                    rank = index + 1,
                    name = name,
                    score = score,
                    highlight = isWinner,
                    isYou = name.equals(currentPlayerName, ignoreCase = true)
                )
                if (index != ranking.lastIndex) Spacer(Modifier.height(10.dp))
            }
        }
    }
}

@Composable
private fun FinalScoreRow(
    rank: Int,
    name: String,
    score: Int,
    highlight: Boolean,
    isYou: Boolean,
) {
    val rowModifier = if (highlight) {
        Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.horizontalGradient(listOf(Color(0xFFF97316), Color(0xFFEA580C))),
                shape = RoundedCornerShape(12.dp)
            )
            .padding(14.dp)
    } else {
        Modifier
            .fillMaxWidth()
            .background(Color(0xFF0B0F19), RoundedCornerShape(12.dp))
            .padding(14.dp)
    }

    Row(
        modifier = rowModifier,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Rank badge
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF97316)),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        ) {
            Text("$rank", modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), color = Color.Black, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.width(12.dp))

        // Name (+ you / champion label)
        Column(Modifier.weight(1f)) {
            val suffix = buildString {
                if (isYou) append(" (YOU)")
            }
            Text(
                text = name + suffix,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontWeight = if (highlight) FontWeight.Bold else FontWeight.Normal
            )
            if (highlight) {
                Spacer(Modifier.height(2.dp))
                Text("CHAMPION!", color = Color(0xFF111827), fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
            }
        }

        // Score badge on the right
        ScoreBadge(score)
    }
}