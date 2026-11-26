package com.hasn2mr.caredesk.admin.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.hasn2mr.caredesk.admin.AppContainer
import com.hasn2mr.caredesk.admin.data.Account
import com.hasn2mr.caredesk.admin.data.AccountsState
import com.hasn2mr.caredesk.admin.data.SyncResult
import com.hasn2mr.caredesk.admin.util.Dates
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth

data class Stats(val d1: Int = 0, val d7: Int = 0, val d30: Int = 0)

@OptIn(ExperimentalCoroutinesApi::class)
class MainViewModel(private val c: AppContainer) : ViewModel() {

    val accounts: StateFlow<AccountsState> = c.accounts.state
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AccountsState(false, emptyList(), null))

    private val active = accounts.map { it.active }.distinctUntilChanged()

    private val _month = MutableStateFlow(YearMonth.now())
    val month: StateFlow<YearMonth> = _month

    /** Slide direction of the last month change: +1 forward, -1 back. */
    var direction = 1
        private set

    val dayCounts: StateFlow<Map<String, Int>> = combine(active, _month) { a, m -> a to m }
        .flatMapLatest { (a, m) ->
            if (a == null) flowOf(emptyMap())
            else c.db.sessions().dayCounts(a.id, Dates.format(m.atDay(1)), Dates.format(m.atEndOfMonth()))
                .map { list -> list.associate { it.date to it.count } }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())

    /** Quick stats: windows that end today (24 h = today, 7 d = last 7 days, 30 d = last 30 days). */
    val stats: StateFlow<Stats> = active.flatMapLatest { a ->
        if (a == null) flowOf(Stats()) else {
            val today = LocalDate.now()
            fun w(days: Long) = c.db.sessions().countBetween(a.id, Dates.format(today.minusDays(days - 1)), Dates.format(today))
            combine(w(1), w(7), w(30)) { x, y, z -> Stats(x, y, z) }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), Stats())

    private val _sync = MutableStateFlow<SyncUi>(SyncUi.Idle)
    val sync: StateFlow<SyncUi> = _sync

    /** True when the local database holds nothing for the active account yet (offers the demo data link). */
    private val _empty = MutableStateFlow(false)
    val empty: StateFlow<Boolean> = _empty

    init {
        viewModelScope.launch { active.collect { a -> if (a != null) { refreshEmpty(a); refresh() } } }
    }

    private suspend fun refreshEmpty(a: Account) { _empty.value = c.db.sessions().total(a.id) == 0 }

    fun prev() { direction = -1; _month.update { it.minusMonths(1) } }
    fun next() { direction = 1; _month.update { it.plusMonths(1) } }
    fun today() {
        val now = YearMonth.now()
        direction = if (now.isAfter(_month.value)) 1 else -1
        _month.value = now
    }

    fun refresh() {
        val a = accounts.value.active ?: return
        if (_sync.value is SyncUi.Running) return
        _sync.value = SyncUi.Running
        viewModelScope.launch {
            val r = c.repo.syncLight(a)
            refreshEmpty(a)
            _sync.value = when (r) { SyncResult.OK -> SyncUi.Done; else -> SyncUi.Failed(r) }
        }
    }

    fun loadDemo() {
        val a = accounts.value.active ?: return
        viewModelScope.launch { c.repo.seedDemo(a); refreshEmpty(a) }
    }

    fun switchTo(id: String) { viewModelScope.launch { c.accounts.setActive(id) } }
    fun signOut(id: String) {
        viewModelScope.launch { c.db.sessions().clear(id); c.accounts.remove(id) }
    }

    class Factory(private val c: AppContainer) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = MainViewModel(c) as T
    }
}

sealed interface SyncUi {
    data object Idle : SyncUi
    data object Running : SyncUi
    data object Done : SyncUi
    data class Failed(val why: SyncResult) : SyncUi
}
