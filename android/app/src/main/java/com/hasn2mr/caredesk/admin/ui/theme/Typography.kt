package com.hasn2mr.caredesk.admin.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import com.hasn2mr.caredesk.admin.R

// The .ttf files are fetched by scripts/fetch-fonts.sh (CI) or taken from android/fonts-custom/.
// Arabic headings: Zain.  Arabic body: Zanjabeel (falls back to Zain).  Latin headings: Playfair Display / Wasted Vindey.  Latin body: Inter.

val ArabicHeading = FontFamily(
    Font(R.font.zain_light, FontWeight.Light),
    Font(R.font.zain_regular, FontWeight.Normal),
    Font(R.font.zain_bold, FontWeight.Bold),
    Font(R.font.zain_extrabold, FontWeight.ExtraBold),
)

val ArabicBody = FontFamily(
    Font(R.font.arabic_body_regular, FontWeight.Normal),
    Font(R.font.arabic_body_bold, FontWeight.Bold),
)

private fun variable(res: Int, w: FontWeight) =
    Font(res, w, FontStyle.Normal, variationSettings = FontVariation.Settings(w, FontStyle.Normal))

val LatinHeading = FontFamily(
    variable(R.font.latin_heading, FontWeight.Normal),
    variable(R.font.latin_heading, FontWeight.SemiBold),
    variable(R.font.latin_heading, FontWeight.Bold),
)

val LatinBody = FontFamily(
    variable(R.font.inter_var, FontWeight.Normal),
    variable(R.font.inter_var, FontWeight.Medium),
    variable(R.font.inter_var, FontWeight.SemiBold),
    variable(R.font.inter_var, FontWeight.Bold),
)

private fun TextUnit.scaled(f: Float): TextUnit = (value * f).sp

/** Typography for the current language; [scale] is the user's font-size setting (0.85–1.3). */
fun careDeskTypography(arabic: Boolean, scale: Float): Typography {
    val heading = if (arabic) ArabicHeading else LatinHeading
    val body = if (arabic) ArabicBody else LatinBody
    fun h(size: Int, line: Int, w: FontWeight = FontWeight.Bold) =
        TextStyle(fontFamily = heading, fontWeight = w, fontSize = size.sp.scaled(scale), lineHeight = line.sp.scaled(scale))
    fun b(size: Int, line: Int, w: FontWeight = FontWeight.Normal) =
        TextStyle(fontFamily = body, fontWeight = w, fontSize = size.sp.scaled(scale), lineHeight = line.sp.scaled(scale))
    return Typography(
        displayLarge = h(44, 52), displayMedium = h(36, 44), displaySmall = h(30, 38),
        headlineLarge = h(28, 36), headlineMedium = h(24, 32), headlineSmall = h(21, 28),
        titleLarge = h(20, 28), titleMedium = h(17, 24, FontWeight.SemiBold), titleSmall = h(15, 22, FontWeight.SemiBold),
        bodyLarge = b(16, 24), bodyMedium = b(14, 21), bodySmall = b(12, 18),
        labelLarge = b(14, 20, FontWeight.SemiBold), labelMedium = b(12, 16, FontWeight.Medium), labelSmall = b(11, 14, FontWeight.Medium),
    )
}
