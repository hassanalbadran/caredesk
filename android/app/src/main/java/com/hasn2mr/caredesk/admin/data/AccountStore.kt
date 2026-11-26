package com.hasn2mr.caredesk.admin.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

private val Context.accountsStore by preferencesDataStore(name = "accounts")

data class AccountsState(val loaded: Boolean, val accounts: List<Account>, val active: Account?)

/** Up to [MAX] accounts with a seamless switcher. Tokens live in app-private storage (excluded from backups). */
class AccountStore(private val ctx: Context) {
    private val kAccounts = stringPreferencesKey("accounts")
    private val kActive = stringPreferencesKey("active")
    private val json = Json { ignoreUnknownKeys = true }
    private val ser = ListSerializer(Account.serializer())

    val state: Flow<AccountsState> = ctx.accountsStore.data.map { p ->
        val list = runCatching { json.decodeFromString(ser, p[kAccounts] ?: "[]") }.getOrDefault(emptyList())
        AccountsState(true, list, list.firstOrNull { it.id == p[kActive] } ?: list.firstOrNull())
    }

    /** Returns false when the 3-account limit is reached and this is a new account. */
    suspend fun add(acc: Account): Boolean {
        var ok = true
        ctx.accountsStore.edit { p ->
            val list = runCatching { json.decodeFromString(ser, p[kAccounts] ?: "[]") }.getOrDefault(emptyList())
            val exists = list.any { it.id == acc.id }
            if (!exists && list.size >= MAX) { ok = false; return@edit }
            p[kAccounts] = json.encodeToString(ser, list.filter { it.id != acc.id } + acc)
            p[kActive] = acc.id
        }
        return ok
    }

    suspend fun setActive(id: String) { ctx.accountsStore.edit { it[kActive] = id } }

    suspend fun remove(id: String) {
        ctx.accountsStore.edit { p ->
            val list = runCatching { json.decodeFromString(ser, p[kAccounts] ?: "[]") }.getOrDefault(emptyList())
            val rest = list.filter { it.id != id }
            p[kAccounts] = json.encodeToString(ser, rest)
            if (p[kActive] == id) { if (rest.isEmpty()) p.remove(kActive) else p[kActive] = rest.first().id }
        }
    }

    companion object { const val MAX = 3 }
}
