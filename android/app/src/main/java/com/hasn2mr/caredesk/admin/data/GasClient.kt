package com.hasn2mr.caredesk.admin.data

import android.content.Context
import android.provider.Settings
import com.hasn2mr.caredesk.admin.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

/**
 * Thin client for the Google Apps Script web app (the same one the desktop dashboard uses).
 * Never throws: network problems become { ok:false, code:"OFFLINE" } so callers can stay offline-first.
 */
class GasClient(private val ctx: Context) {
    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    private val json = Json { ignoreUnknownKeys = true }
    private val textPlain = "text/plain;charset=utf-8".toMediaType() // avoids a CORS-style preflight on Apps Script

    suspend fun post(body: JsonObject): JsonObject = withContext(Dispatchers.IO) {
        try {
            val req = Request.Builder().url(BuildConfig.GAS_URL).post(body.toString().toRequestBody(textPlain)).build()
            http.newCall(req).execute().use { res ->
                val text = res.body?.string().orEmpty()
                json.parseToJsonElement(text).jsonObject
            }
        } catch (e: IOException) {
            fail("OFFLINE")
        } catch (e: Exception) {
            fail("BAD_RESPONSE")
        }
    }

    private fun fail(code: String) = buildJsonObject { put("ok", false); put("code", code) }

    /** Stable per-install identity used by the server's device-seat rules (1 phone seat per account by default). */
    fun fingerprint(): String {
        val androidId = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
        val bytes = MessageDigest.getInstance("SHA-256").digest("caredesk-android:$androidId".toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    fun androidId(): String = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
}
