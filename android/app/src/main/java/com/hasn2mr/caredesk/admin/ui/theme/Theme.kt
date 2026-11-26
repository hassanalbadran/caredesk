package com.hasn2mr.caredesk.admin.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.hasn2mr.caredesk.admin.data.UiSettings

private val Dark = darkColorScheme(
    primary = Sage, onPrimary = Ink,
    primaryContainer = Moss, onPrimaryContainer = Mist,
    secondary = Moss, onSecondary = Mist,
    secondaryContainer = Forest, onSecondaryContainer = Mist,
    tertiary = Amber, onTertiary = Ink,
    background = Ink, onBackground = Mist,
    surface = Deep, onSurface = Mist,
    surfaceVariant = Forest, onSurfaceVariant = Sage,
    surfaceContainer = Deep, surfaceContainerHigh = Forest,
    outline = Moss, outlineVariant = Forest,
    error = Alert, onError = Ink,
)

private val Light = lightColorScheme(
    primary = Moss, onPrimary = Color.White,
    primaryContainer = Mist, onPrimaryContainer = Ink,
    secondary = Sage, onSecondary = Ink,
    secondaryContainer = Color(0xFFE6F3E9), onSecondaryContainer = Ink,
    tertiary = Color(0xFF9A7413), onTertiary = Color.White,
    background = Color(0xFFF1F7F3), onBackground = Ink,
    surface = Color.White, onSurface = Ink,
    surfaceVariant = Color(0xFFE3EEE6), onSurfaceVariant = Moss,
    surfaceContainer = Color.White, surfaceContainerHigh = Color(0xFFE9F2EC),
    outline = Sage, outlineVariant = Color(0xFFD3E4D8),
    error = Color(0xFFB3261E), onError = Color.White,
)

/** Reduce-motion flag read by animated composables. */
val LocalReduceMotion = staticCompositionLocalOf { false }

@Composable
fun CareDeskTheme(settings: UiSettings, arabic: Boolean, content: @Composable () -> Unit) {
    val dark = when (settings.theme) {
        "dark" -> true
        "light" -> false
        else -> isSystemInDarkTheme()
    }
    CompositionLocalProvider(LocalReduceMotion provides settings.reduceMotion) {
        MaterialTheme(
            colorScheme = if (dark) Dark else Light,
            typography = careDeskTypography(arabic, settings.fontScale),
            content = content,
        )
    }
}

/** Soft "neo-tactile" surface: raised gradient body, a faint top highlight and a deep, diffuse shadow. */
@Composable
fun Modifier.neo(shape: Shape = RoundedCornerShape(22.dp), elevation: Dp = 10.dp): Modifier {
    val cs = MaterialTheme.colorScheme
    val dark = cs.background.luminance() < 0.5f
    return this
        .shadow(elevation, shape, ambientColor = Color.Black, spotColor = Color.Black)
        .background(Brush.verticalGradient(listOf(cs.surfaceContainerHigh, cs.surface)), shape)
        .border(
            1.dp,
            Brush.verticalGradient(listOf(Color.White.copy(alpha = if (dark) 0.10f else 0.9f), Color.Transparent)),
            shape,
        )
}

private fun Color.luminance(): Float = 0.2126f * red + 0.7152f * green + 0.0722f * blue
