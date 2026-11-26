package com.hasn2mr.caredesk.admin.push

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.hasn2mr.caredesk.admin.MainActivity
import com.hasn2mr.caredesk.admin.R

/** One channel per alert type, so each can get its own sound / importance from the system settings. */
object Notifications {
    const val CH_ALERTS = "alerts"
    const val CH_VIP = "vip"
    const val CH_BROADCAST = "broadcast"
    const val CH_SYNC_FAIL = "sync_fail"

    fun createChannels(ctx: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = ctx.getSystemService(NotificationManager::class.java)
        fun ch(id: String, nameRes: Int, imp: Int) =
            NotificationChannel(id, ctx.getString(nameRes), imp).apply { enableVibration(true) }
        nm.createNotificationChannels(
            listOf(
                ch(CH_ALERTS, R.string.ch_alerts, NotificationManager.IMPORTANCE_HIGH),
                ch(CH_VIP, R.string.ch_vip, NotificationManager.IMPORTANCE_HIGH),
                ch(CH_BROADCAST, R.string.ch_broadcast, NotificationManager.IMPORTANCE_DEFAULT),
                ch(CH_SYNC_FAIL, R.string.ch_sync_fail, NotificationManager.IMPORTANCE_LOW),
            )
        )
    }

    fun channelFor(type: String?): String = when (type) {
        "vip" -> CH_VIP
        "broadcast" -> CH_BROADCAST
        "sync_fail" -> CH_SYNC_FAIL
        else -> CH_ALERTS
    }

    fun canPost(ctx: Context): Boolean =
        Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun show(ctx: Context, type: String?, title: String, body: String, id: Int = (System.currentTimeMillis() % Int.MAX_VALUE).toInt()) {
        if (!canPost(ctx)) return
        val open = PendingIntent.getActivity(
            ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val n = NotificationCompat.Builder(ctx, channelFor(type))
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setColor(ContextCompat.getColor(ctx, R.color.splash_bg))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(open)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
        runCatching { NotificationManagerCompat.from(ctx).notify(id, n) }
    }
}
