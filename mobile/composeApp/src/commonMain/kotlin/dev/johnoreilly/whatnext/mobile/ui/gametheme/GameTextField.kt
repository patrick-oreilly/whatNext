package dev.johnoreilly.whatnext.mobile.ui.gametheme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun GameTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    maxLength: Int? = null,
    enabled: Boolean = true,
) {
    val colors = LocalGameColors.current
    val typography = LocalGameTypography.current
    val shapes = LocalGameShapes.current

    val effectiveLength = value.length
    val isAtLimit = maxLength != null && effectiveLength >= maxLength

    Column(modifier = modifier.fillMaxWidth()) {
        BasicTextField(
            value = value,
            onValueChange = { newValue ->
                if (maxLength == null || newValue.length <= maxLength) {
                    onValueChange(newValue)
                }
            },
            enabled = enabled,
            modifier = Modifier
                .fillMaxWidth()
                .border(shapes.borderWidth, colors.borderBlack)
                .background(colors.surfaceNearBlack)
                .padding(horizontal = 16.dp, vertical = 14.dp),
            textStyle = TextStyle(
                color = colors.onSurfaceWhite,
                fontFamily = typography.bodyFont,
                fontWeight = typography.bodyWeight,
                fontSize = 16.sp,
            ),
            decorationBox = { innerTextField ->
                Box {
                    if (value.isEmpty()) {
                        Text(
                            text = placeholder,
                            style = TextStyle(
                                color = colors.onSurfaceWhite.copy(alpha = 0.5f),
                                fontFamily = typography.bodyFont,
                                fontWeight = typography.bodyWeight,
                                fontSize = 16.sp,
                            ),
                        )
                    }
                    innerTextField()
                }
            },
        )

        if (maxLength != null) {
            Text(
                text = "$effectiveLength / $maxLength",
                modifier = Modifier
                    .align(Alignment.End)
                    .padding(top = 4.dp),
                style = TextStyle(
                    color = if (isAtLimit) colors.primaryOrange else colors.onSurfaceWhite.copy(alpha = 0.6f),
                    fontFamily = typography.codeFont,
                    fontWeight = FontWeight.Normal,
                    fontSize = 12.sp,
                ),
            )
        }
    }
}
