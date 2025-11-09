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

@Composable
internal fun HeaderBar(
    title: String,
    subtitle: String? = null,
    roomCode: String,
    refreshing: Boolean = false,
    onRefresh: (() -> Unit)? = null,
    onCopyRoomCode: () -> Unit,
) {
    val border = BorderStroke(2.dp, Color(0xFFF5F5F4))
    Card(
        shape = RoundedCornerShape(12.dp),
        border = border,
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.headlineSmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                )
                if (subtitle != null) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = subtitle,
                        color = Color(0xFFF97316),
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "ROOM: $roomCode",
                    color = Color.White,
                )
//                Spacer(Modifier.width(8.dp))
//                if (onRefresh != null) {
//                    if (refreshing) {
//                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
//                    } else {
//                        TextButton(onClick = onRefresh) {
//                            Text("Refresh", color = Color(0xFFFFEDD5))
//                        }
//                    }
//                    Spacer(Modifier.width(8.dp))
//                }
//                TextButton(onClick = onCopyRoomCode) {
//                    Text("Copy", color = Color(0xFFFFEDD5))
//                }
            }
        }
    }
}