package com.hasn2mr.caredesk.admin.push

import android.content.Context
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** Keeps the latest FCM token locally; it is re-sent to the server for every signed-in account. */
object PushToken {
    private const val PREFS = "cd_push"

    fun saved(ctx: Context): String? = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("token", null)
    fun save(ctx: Context, t: String) { ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("token", t).apply() }

    suspend fun fetch(ctx: Context): String? = suspendCancellableCoroutine { cont ->
        runCatching {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { t ->
                val v = if (t.isSuccessful) t.result else null
                if (v != null) save(ctx, v)
                if (cont.isActive) cont.resume(v)
            }
        }.onFailure { if (cont.isActive) cont.resume(saved(ctx)) }
    }
}
