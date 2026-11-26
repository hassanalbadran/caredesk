package com.hasn2mr.caredesk.admin.ui.main

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Today
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hasn2mr.caredesk.admin.R
import com.hasn2mr.caredesk.admin.data.Account
import com.hasn2mr.caredesk.admin.data.AccountStore
import com.hasn2mr.caredesk.admin.ui.theme.Amber
import com.hasn2mr.caredesk.admin.ui.theme.Alert
import com.hasn2mr.caredesk.admin.ui.theme.LocalReduceMotion
import com.hasn2mr.caredesk.admin.ui.theme.neo
import com.hasn2mr.caredesk.admin.util.Dates
import kotlinx.coroutines.delay
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

/** Load colours match the desktop app: green = light day, yellow = busy, red = overloaded. */
private fun loadColor(count: Int): Color? = when {
    count <= 0 -> null
    count >= 9 -> Alert
    count >= 5 -> Amber
    else -> Color(0xFF4CAF7A)
}

@Composable
fun MainScreen(vm: MainViewModel, onOpenDay: (String) -> Unit, onAddAccount: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val accounts by vm.accounts.collectAsStateWithLifecycle()
    val month by vm.month.collectAsStateWithLifecycle()
    val counts by vm.dayCounts.collectAsStateWithLifecycle()
    val stats by vm.stats.collectAsStateWithLifecycle()
    val sync by vm.sync.collectAsStateWithLifecycle()
    val empty by vm.empty.collectAsStateWithLifecycle()

    Column(
        Modifier
            .fillMaxSize()
            .background(cs.background)
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        TopBar(
            accounts.accounts, accounts.active, sync is SyncUi.Running,
            onRefresh = vm::refresh, onSwitch = vm::switchTo, onAdd = onAddAccount, onSignOut = vm::signOut,
        )
        StatsRow(stats)
        SyncBanner(sync)
        CalendarCard(
            vm = vm, month = month, counts = counts, onOpenDay = onOpenDay,
        )
        AnimatedVisibility(empty) { EmptyHint(onDemo = vm::loadDemo, onRefresh = vm::refresh) }
        Spacer(Modifier.height(24.dp))
    }
}

// ---- top bar + account switcher ---------------------------------------------------------------------------------

@Composable
private fun TopBar(
    accounts: List<Account>, active: Account?, syncing: Boolean,
    onRefresh: () -> Unit, onSwitch: (String) -> Unit, onAdd: () -> Unit, onSignOut: (String) -> Unit,
) {
    val cs = MaterialTheme.colorScheme
    var open by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box {
            Row(
                Modifier.clip(RoundedCornerShape(50)).neo(RoundedCornerShape(50), 6.dp).clickable { open = true }
                    .padding(start = 6.dp, end = 14.dp, top = 6.dp, bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Avatar(active?.username.orEmpty())
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(active?.username.orEmpty(), style = MaterialTheme.typography.titleSmall, color = cs.onSurface)
                    if (accounts.size > 1) Text(
                        stringResource(R.string.accounts_count, accounts.size, AccountStore.MAX),
                        style = MaterialTheme.typography.labelSmall, color = cs.onSurfaceVariant,
                    )
                }
            }
            DropdownMenu(open, { open = false }) {
                accounts.forEach { a ->
                    DropdownMenuItem(
                        text = { Text(a.username + if (a.id == active?.id) "  ✓" else "") },
                        leadingIcon = { Avatar(a.username, 28) },
                        onClick = { open = false; if (a.id != active?.id) onSwitch(a.id) },
                    )
                }
                if (accounts.size < AccountStore.MAX) DropdownMenuItem(
                    text = { Text(stringResource(R.string.add_account)) },
                    leadingIcon = { Icon(Icons.Outlined.Add, null) },
                    onClick = { open = false; onAdd() },
                )
                if (active != null) DropdownMenuItem(
                    text = { Text(stringResource(R.string.sign_out), color = cs.error) },
                    leadingIcon = { Icon(Icons.AutoMirrored.Outlined.Logout, null, tint = cs.error) },
                    onClick = { open = false; onSignOut(active.id) },
                )
            }
        }
        Spacer(Modifier.weight(1f))
        IconButton(onRefresh, enabled = !syncing) {
            if (syncing) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            else Icon(Icons.Outlined.Refresh, stringResource(R.string.sync))
        }
    }
}

@Composable
private fun Avatar(name: String, size: Int = 38) {
    val cs = MaterialTheme.colorScheme
    Box(Modifier.size(size.dp).clip(CircleShape).background(cs.primary), contentAlignment = Alignment.Center) {
        Text(name.trim().take(1).uppercase(), color = cs.onPrimary, style = MaterialTheme.typography.titleSmall)
    }
}

// ---- stats ------------------------------------------------------------------------------------------------------

@Composable
private fun StatsRow(s: Stats) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        StatCard(Modifier.weight(1f), R.string.stats_24h, s.d1)
        StatCard(Modifier.weight(1f), R.string.stats_7d, s.d7)
        StatCard(Modifier.weight(1f), R.string.stats_30d, s.d30)
    }
}

@Composable
private fun StatCard(modifier: Modifier, label: Int, value: Int) {
    val cs = MaterialTheme.colorScheme
    val still = LocalReduceMotion.current
    val shown by animateFloatAsState(value.toFloat(), tween(if (still) 0 else 600), label = "stat")
    Column(modifier.neo(RoundedCornerShape(22.dp), 8.dp).padding(14.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(stringResource(label), style = MaterialTheme.typography.labelMedium, color = cs.onSurfaceVariant)
        Text(shown.toInt().toString(), style = MaterialTheme.typography.headlineLarge, color = cs.primary)
        Text(stringResource(R.string.sessions_unit), style = MaterialTheme.typography.labelSmall, color = cs.onSurfaceVariant)
    }
}

@Composable
private fun SyncBanner(s: SyncUi) {
    val msg = when ((s as? SyncUi.Failed)?.why) {
        null -> null
        com.hasn2mr.caredesk.admin.data.SyncResult.OFFLINE -> R.string.sync_offline
        com.hasn2mr.caredesk.admin.data.SyncResult.AUTH -> R.string.sync_auth
        else -> R.string.sync_error
    }
    AnimatedVisibility(msg != null, enter = fadeIn(), exit = fadeOut()) {
        Text(
            stringResource(msg ?: R.string.sync_error),
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.tertiary,
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
                .background(MaterialTheme.colorScheme.tertiary.copy(alpha = 0.12f)).padding(12.dp),
        )
    }
}

// ---- calendar ---------------------------------------------------------------------------------------------------

@OptIn(ExperimentalAnimationApi::class, ExperimentalFoundationApi::class)
@Composable
private fun CalendarCard(vm: MainViewModel, month: YearMonth, counts: Map<String, Int>, onOpenDay: (String) -> Unit) {
    val cs = MaterialTheme.colorScheme
    val still = LocalReduceMotion.current
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    val locale = LocalConfiguration.current.locales[0] ?: Locale.getDefault()
    val arabic = locale.language == "ar"
    val haptic = LocalHapticFeedback.current
    var headerMenu by remember { mutableStateOf(false) }

    // Hidden menus close themselves after 3 seconds.
    LaunchedEffect(headerMenu) { if (headerMenu) { delay(3000); headerMenu = false } }

    Column(
        Modifier.fillMaxWidth().neo(RoundedCornerShape(28.dp), 12.dp).padding(14.dp)
            .pointerInput(rtl) {
                var dx = 0f
                detectHorizontalDragGestures(
                    onDragStart = { dx = 0f },
                    onDragEnd = {
                        // Finger moving towards the start edge = next month (mirrored in RTL).
                        if (dx < -80f) { if (rtl) vm.prev() else vm.next() }
                        else if (dx > 80f) { if (rtl) vm.next() else vm.prev() }
                    },
                    onHorizontalDrag = { _, d -> dx += d },
                )
            },
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(vm::prev) { Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, stringResource(R.string.prev_month)) }
            Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                Text(
                    month.month.getDisplayName(TextStyle.FULL, locale) + " " + month.year,
                    style = MaterialTheme.typography.titleLarge, color = cs.onSurface, textAlign = TextAlign.Center,
                    modifier = Modifier.clip(RoundedCornerShape(12.dp)).combinedClickable(
                        onClick = {},
                        onLongClick = { haptic.performHapticFeedback(HapticFeedbackType.LongPress); headerMenu = true },
                    ).padding(horizontal = 10.dp, vertical = 4.dp),
                )
                DropdownMenu(headerMenu, { headerMenu = false }) {
                    DropdownMenuItem(
                        text = { Text(stringResource(R.string.jump_today)) },
                        leadingIcon = { Icon(Icons.Outlined.Today, null) },
                        onClick = { headerMenu = false; vm.today() },
                    )
                    DropdownMenuItem(
                        text = { Text(stringResource(R.string.sync)) },
                        leadingIcon = { Icon(Icons.Outlined.Refresh, null) },
                        onClick = { headerMenu = false; vm.refresh() },
                    )
                }
            }
            IconButton(vm::next) { Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, stringResource(R.string.next_month)) }
        }

        val first = if (arabic) DayOfWeek.SATURDAY else DayOfWeek.SUNDAY
        Row(Modifier.fillMaxWidth()) {
            for (i in 0 until 7) {
                Text(
                    first.plus(i.toLong()).getDisplayName(TextStyle.SHORT, locale),
                    modifier = Modifier.weight(1f), textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelMedium, color = cs.onSurfaceVariant,
                )
            }
        }

        AnimatedContent(
            targetState = month,
            transitionSpec = {
                val dir = vm.direction
                if (still) fadeIn(tween(0)) togetherWith fadeOut(tween(0))
                else (slideInHorizontally(tween(260)) { it * dir / 3 } + fadeIn(tween(260)))
                    .togetherWith(slideOutHorizontally(tween(220)) { -it * dir / 3 } + fadeOut(tween(160)))
            },
            label = "month",
        ) { ym -> MonthGrid(ym, first, counts, onOpenDay) }

        Legend()
    }
}

@Composable
private fun MonthGrid(ym: YearMonth, first: DayOfWeek, counts: Map<String, Int>, onOpenDay: (String) -> Unit) {
    val today = LocalDate.now()
    val offset = (ym.atDay(1).dayOfWeek.value - first.value + 7) % 7
    val rows = (offset + ym.lengthOfMonth() + 6) / 7
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        for (r in 0 until rows) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                for (cIdx in 0 until 7) {
                    val dayNo = r * 7 + cIdx - offset + 1
                    if (dayNo < 1 || dayNo > ym.lengthOfMonth()) {
                        Spacer(Modifier.weight(1f).aspectRatio(0.82f))
                    } else {
                        val date = ym.atDay(dayNo)
                        val iso = Dates.format(date)
                        DayCell(Modifier.weight(1f), dayNo, counts[iso] ?: 0, date == today, date.isBefore(today)) { onOpenDay(iso) }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun DayCell(modifier: Modifier, day: Int, count: Int, isToday: Boolean, past: Boolean, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val haptic = LocalHapticFeedback.current
    val tint = loadColor(count)
    var menu by remember { mutableStateOf(false) }
    LaunchedEffect(menu) { if (menu) { delay(3000); menu = false } }
    var pressed by remember { mutableStateOf(false) }
    val sc by animateFloatAsState(if (pressed) 0.94f else 1f, tween(if (LocalReduceMotion.current) 0 else 120), label = "press")

    Box(modifier.aspectRatio(0.82f).scale(sc)) {
        Column(
            Modifier.fillMaxSize()
                .clip(RoundedCornerShape(14.dp))
                .background(if (tint != null) tint.copy(alpha = if (past) 0.10f else 0.18f) else cs.background.copy(alpha = 0.35f))
                .then(if (isToday) Modifier.border(2.dp, cs.primary, RoundedCornerShape(14.dp)) else Modifier)
                .combinedClickable(
                    onClick = onClick,
                    onLongClick = { haptic.performHapticFeedback(HapticFeedbackType.LongPress); menu = true },
                )
                .padding(vertical = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                day.toString(),
                style = MaterialTheme.typography.labelLarge,
                color = if (past) cs.onSurfaceVariant else cs.onSurface,
            )
            if (count > 0) Box(
                Modifier.clip(RoundedCornerShape(50)).background(tint ?: cs.primary).padding(horizontal = 7.dp, vertical = 1.dp),
            ) { Text(count.toString(), style = MaterialTheme.typography.labelSmall, color = Color(0xFF051F20)) }
            else Spacer(Modifier.height(14.dp))
        }
        DropdownMenu(menu, { menu = false }) {
            DropdownMenuItem(text = { Text(stringResource(R.string.open_day)) }, onClick = { menu = false; onClick() })
        }
    }
}

@Composable
private fun Legend() {
    val cs = MaterialTheme.colorScheme
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterHorizontally)) {
        listOf(R.string.load_light to Color(0xFF4CAF7A), R.string.load_busy to Amber, R.string.load_full to Alert).forEach { (label, col) ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(9.dp).clip(CircleShape).background(col))
                Spacer(Modifier.width(5.dp))
                Text(stringResource(label), style = MaterialTheme.typography.labelSmall, color = cs.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun EmptyHint(onDemo: () -> Unit, onRefresh: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    Column(
        Modifier.fillMaxWidth().neo(RoundedCornerShape(22.dp), 6.dp).padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(stringResource(R.string.empty_title), style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
        Text(stringResource(R.string.empty_body), style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(stringResource(R.string.sync), color = cs.primary, style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.clickable { onRefresh() }.padding(vertical = 6.dp))
            Text(stringResource(R.string.load_demo), color = cs.primary, style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.clickable { onDemo() }.padding(vertical = 6.dp))
        }
    }
}
