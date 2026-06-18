package dev.johnoreilly.whatnext.mobile.ui.gametheme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun GameBox(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = LocalGameColors.current
    val shapes = LocalGameShapes.current

    Box(modifier) {
        Box(
            modifier = Modifier
                .matchParentSize()
                .offset(x = shapes.borderWidth, y = shapes.borderWidth)
                .background(colors.borderBlack),
        )
        Box(
            modifier = Modifier
                .border(shapes.borderWidth, colors.borderBlack)
                .background(colors.surfaceNearBlack)
                .padding(16.dp),
        ) {
            content()
        }
    }
}
