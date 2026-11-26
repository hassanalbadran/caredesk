package com.hasn2mr.caredesk.admin.util

import android.content.Context
import android.content.res.Configuration
import java.util.Locale

/** The language is mirrored in plain SharedPreferences so it can be read synchronously in attachBaseContext. */
object LocaleHelper {
    private const val PREFS = "cd_locale"
    private const val KEY = "lang" // "system" | "ar" | "en"

    fun saved(ctx: Context): String =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "system") ?: "system"

    fun save(ctx: Context, lang: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, lang).apply()
    }

    fun isArabic(ctx: Context): Boolean = ctx.resources.configuration.locales[0].language == "ar"

    fun wrap(base: Context): Context {
        val lang = saved(base)
        if (lang == "system") return base
        val locale = Locale(lang)
        Locale.setDefault(locale)
        val cfg = Configuration(base.resources.configuration)
        cfg.setLocale(locale)
        cfg.setLayoutDirection(locale)
        return base.createConfigurationContext(cfg)
    }
}
