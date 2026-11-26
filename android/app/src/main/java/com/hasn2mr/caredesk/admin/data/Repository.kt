package com.hasn2mr.caredesk.admin.data

import com.hasn2mr.caredesk.admin.util.Dates
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import java.time.LocalDate

sealed interface AuthResult {
    data class Ok(val account: Account) : AuthResult
    data class Error(val code: String) : AuthResult
}

enum class SyncResult { OK, OFFLINE, AUTH, ERROR }

class Repository(private val gas: GasClient, private val db: AppDb, private val accounts: AccountStore) {

    private fun JsonObject.str(k: String): String = (this[k] as? JsonPrimitive)?.contentOrNull.orEmpty()
    private fun JsonObject.code(): String = str("code").ifEmpty { "ERROR" }
    private fun JsonObject.ok(): Boolean = (this["ok"] as? JsonPrimitive)?.booleanOrNull == true

    // ---- accounts -----------------------------------------------------------------------------------------------

    suspend fun login(id: String, password: String, deviceName: String): AuthResult {
        val res = gas.post(buildJsonObject {
            put("action", "login"); put("id", id.trim()); put("password", password)
            put("fp", gas.fingerprint()); put("deviceName", deviceName); put("platform", "android")
            putJsonObject("parts") { put("uuid", gas.androidId()) }
        })
        if (!res.ok()) return AuthResult.Error(res.code())
        val acc = res["account"]?.jsonObject ?: return AuthResult.Error("BAD_RESPONSE")
        val account = Account(
            id = acc.str("id"), username = acc.str("username"), email = acc.str("email"), session = res.str("session"),
        )
        if (account.id.isEmpty()) return AuthResult.Error("BAD_RESPONSE")
        return if (accounts.add(account)) AuthResult.Ok(account) else AuthResult.Error("ACCOUNT_LIMIT")
    }

    suspend fun register(username: String, email: String, phone: String, password: String, lang: String, deviceName: String): AuthResult {
        val res = gas.post(buildJsonObject {
            put("action", "register"); put("username", username.trim()); put("email", email.trim())
            put("phone", phone.trim()); put("password", password); put("lang", lang); put("promo", false)
        })
        if (!res.ok()) return AuthResult.Error(res.code())
        // Registration succeeded; sign in straight away (e-mail confirmation stays optional, like on the desktop).
        return login(username, password, deviceName)
    }

    /** Tells the server which FCM token belongs to this signed-in account (server endpoint arrives with the GAS batch). */
    suspend fun registerPush(acc: Account, token: String): Boolean {
        val res = gas.post(buildJsonObject {
            put("action", "registerPush"); put("session", acc.session); put("token", token); put("platform", "android")
        })
        return res.ok()
    }

    // ---- sync ---------------------------------------------------------------------------------------------------

    /**
     * Tier 1 (light): today's sessions and upcoming appointments, differential since the last cursor.
     * Expected server reply: { ok, upserts:[{id,date,time,patient,type,device,status,vip,walkIn,updatedAt}], deleted:[id] }
     * (the server side of this endpoint is delivered with the next batch).
     */
    suspend fun syncLight(acc: Account): SyncResult {
        val since = db.sessions().lastUpdated(acc.id) ?: 0L
        val res = gas.post(buildJsonObject {
            put("action", "syncLight"); put("session", acc.session); put("since", since)
        })
        if (!res.ok()) return when (res.code()) { "OFFLINE" -> SyncResult.OFFLINE; "AUTH" -> SyncResult.AUTH; else -> SyncResult.ERROR }
        val rows = (res["upserts"] as? JsonArray ?: JsonArray(emptyList())).mapNotNull { e ->
            val o = e.jsonObject
            val id = o.str("id"); val date = o.str("date")
            if (id.isEmpty() || date.isEmpty()) null else SessionEntity(
                accountId = acc.id, id = id, date = date, time = o.str("time"),
                patientName = o.str("patient"), type = o.str("type"), device = o.str("device"),
                status = o.str("status").ifEmpty { "booked" },
                vip = (o["vip"] as? JsonPrimitive)?.booleanOrNull == true,
                walkIn = (o["walkIn"] as? JsonPrimitive)?.booleanOrNull == true,
                updatedAt = (o["updatedAt"] as? JsonPrimitive)?.longOrNull ?: System.currentTimeMillis(),
            )
        }
        if (rows.isNotEmpty()) db.sessions().upsert(rows)
        val gone = (res["deleted"] as? JsonArray)?.map { it.jsonPrimitive.content }.orEmpty()
        if (gone.isNotEmpty()) db.sessions().delete(acc.id, gone)
        return SyncResult.OK
    }

    /** Sample data so the UI can be explored before the desktop->server sync is switched on. */
    suspend fun seedDemo(acc: Account) {
        val today = LocalDate.now()
        val names = listOf("أحمد علي", "سارة حسن", "محمد كريم", "زينب جاسم", "علي حسين", "نور الهدى", "حيدر صالح", "مريم عباس")
        val types = listOf("علاج طبيعي", "تأهيل", "تدليك طبي")
        val devices = listOf("جهاز 1", "جهاز 2", "جهاز 3")
        val rows = mutableListOf<SessionEntity>()
        var n = 0
        for (d in -20..25) {
            val day = today.plusDays(d.toLong())
            val k = (day.dayOfMonth * 7 + d * 3).mod(9)
            for (i in 0 until k) {
                n++
                val past = d < 0
                rows += SessionEntity(
                    accountId = acc.id, id = "demo-$n", date = Dates.format(day),
                    time = "%02d:%02d".format(9 + (i % 9), if (i % 2 == 0) 0 else 30),
                    patientName = names[(n + i) % names.size], type = types[i % types.size], device = devices[i % devices.size],
                    status = if (past) (if (n % 7 == 0) "missed" else "attended") else "booked",
                    vip = n % 11 == 0, walkIn = n % 13 == 0, updatedAt = System.currentTimeMillis(),
                )
            }
        }
        db.sessions().upsert(rows)
    }
}
