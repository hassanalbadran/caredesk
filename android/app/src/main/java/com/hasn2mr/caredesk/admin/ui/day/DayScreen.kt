package com.hasn2mr.caredesk.admin.ui.day

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.hasn2mr.caredesk.admin.AppContainer
import com.hasn2mr.caredesk.admin.R
import com.hasn2mr.caredesk.admin.data.SessionEntity
import com.hasn2mr.caredesk.admin.ui.theme.neo
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf

/** Placeholder day list for batch 1; the full day view (dedupe, late warning, Walk-ins folder, VIP) comes in batch 2. */
@OptIn(ExperimentalCoroutinesApi::class)
@Composable
fun DayScreen(c: AppContainer, date: String, onBack: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val flow = remember(date) {
        c.accounts.state.flatMapLatest { st -> st.active?.let { c.db.sessions().forDay(it.id, date) } ?: flowOf(emptyList()) }
    }
    val list by flow.collectAsState(initial = emptyList())
    
    Column(
        Modifier
            .fillMaxSize()
            .background(cs.background)
            .systemBarsPadding()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { 
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.back)) 
            }
            Text(date, style = MaterialTheme.typography.headlineSmall, color = cs.onBackground)
        }
        
        if (list.isEmpty()) {
            Text(stringResource(R.string.no_sessions), color = cs.onSurfaceVariant)
        }
        
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            // تم إصلاح الخطأ هنا: إزالة key وإضافة items = list
            items(items = list) { session ->
                SessionRow(session)
            }
        }
    }
}

@Composable
private fun SessionRow(s: SessionEntity) {
    val cs = MaterialTheme.colorScheme
    Row(
        Modifier
            .fillMaxWidth()
            .neo(RoundedCornerShape(18.dp), 5.dp)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(s.time, style = MaterialTheme.typography.titleMedium, color = cs.primary, modifier = Modifier.padding(end = 14.dp))
        Column(Modifier.weight(1f)) {
            Text(s.patientName, style = MaterialTheme.typography.titleSmall, color = cs.onSurface)
            Text(listOf(s.type, s.device).filter { it.isNotBlank() }.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
        }
        Text(s.status, style = MaterialTheme.typography.labelSmall, color = cs.onSurfaceVariant)
    }
}