package com.hasn2mr.caredesk.admin.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.hasn2mr.caredesk.admin.util.LocaleHelper
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsStore by preferencesDataStore(name = "settings")

data class UiSettings(
    val theme: String = "system",     // system | light | dark
    val lang: String = "system",      // system | ar | en
    val fontScale: Float = 1f,        // 0.85 .. 1.3
    val reduceMotion: Boolean = false,
)

class SettingsStore(private val ctx: Context) {
    private val kTheme = stringPreferencesKey("theme")
    private val kLang = stringPreferencesKey("lang")
    private val kScale = floatPreferencesKey("fontScale")
    private val kMotion = booleanPreferencesKey("reduceMotion")

    val flow: Flow<UiSettings> = ctx.settingsStore.data.map { p ->
        UiSettings(p[kTheme] ?: "system", p[kLang] ?: "system", p[kScale] ?: 1f, p[kMotion] ?: false)
    }

    suspend fun setTheme(v: String) { ctx.settingsStore.edit { it[kTheme] = v } }
    suspend fun setLang(v: String) { LocaleHelper.save(ctx, v); ctx.settingsStore.edit { it[kLang] = v } }
    suspend fun setFontScale(v: Float) { ctx.settingsStore.edit { it[kScale] = v.coerceIn(0.85f, 1.3f) } }
    suspend fun setReduceMotion(v: Boolean) { ctx.settingsStore.edit { it[kMotion] = v } }
}
