package com.hasn2mr.caredesk.admin.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.hasn2mr.caredesk.admin.CareDeskApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Data-only messages: { type, title, body, accountId }.
 * A message for an account that is no longer signed in on this phone is dropped, so accounts stay isolated.
 */
class CareDeskMessagingService : FirebaseMessagingService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val app get() = application as CareDeskApp

    override fun onNewToken(token: String) {
        PushToken.save(this, token)
        scope.launch {
            val st = app.container.accounts.state.first()
            st.accounts.forEach { app.container.repo.registerPush(it, token) }
        }
    }

    override fun onMessageReceived(msg: RemoteMessage) {
        val d = msg.data
        val title = d["title"] ?: msg.notification?.title ?: return
        val body = d["body"] ?: msg.notification?.body.orEmpty()
        scope.launch {
            val st = app.container.accounts.state.first()
            val target = d["accountId"]
            if (target != null && st.accounts.none { it.id == target }) return@launch
            Notifications.show(applicationContext, d["type"], title, body)
        }
    }
}
