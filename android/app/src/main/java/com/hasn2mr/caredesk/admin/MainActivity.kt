package com.hasn2mr.caredesk.admin

import android.Manifest
import android.content.Context
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.hasn2mr.caredesk.admin.data.UiSettings
import com.hasn2mr.caredesk.admin.push.PushToken
import com.hasn2mr.caredesk.admin.ui.day.DayScreen
import com.hasn2mr.caredesk.admin.ui.login.AuthViewModel
import com.hasn2mr.caredesk.admin.ui.login.LoginScreen
import com.hasn2mr.caredesk.admin.ui.main.MainScreen
import com.hasn2mr.caredesk.admin.ui.main.MainViewModel
import com.hasn2mr.caredesk.admin.ui.theme.CareDeskTheme
import com.hasn2mr.caredesk.admin.util.LocaleHelper

class MainActivity : ComponentActivity() {

    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(LocaleHelper.wrap(newBase))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val container = (application as CareDeskApp).container

        setContent {
            val settings by container.settings.flow.collectAsStateWithLifecycle(UiSettings())
            val arabic = LocalConfiguration.current.locales[0].language == "ar"
            CareDeskTheme(settings, arabic) {
                Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
                    Root(container, settings.lang)
                }
            }
        }
    }
}

@Composable
private fun Root(c: AppContainer, lang: String) {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val accounts by c.accounts.state.collectAsStateWithLifecycle(com.hasn2mr.caredesk.admin.data.AccountsState(false, emptyList(), null))

    // Ask for the notification permission once (Android 13+).
    val askNotif = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    LaunchedEffect(accounts.active?.id) {
        if (accounts.active != null) {
            if (Build.VERSION.SDK_INT >= 33) askNotif.launch(Manifest.permission.POST_NOTIFICATIONS)
            // Register this phone's FCM token for every signed-in account.
            val token = PushToken.fetch(ctx)
            if (token != null) accounts.accounts.forEach { c.repo.registerPush(it, token) }
        }
    }

    when {
        !accounts.loaded -> Unit
        accounts.active == null -> {
            val vm: AuthViewModel = viewModel(factory = AuthViewModel.Factory(c, lang))
            LoginScreen(vm)
        }
        else -> AppNav(c, lang)
    }
}

@Composable
private fun AppNav(c: AppContainer, lang: String) {
    val nav = rememberNavController()
    val mainVm: MainViewModel = viewModel(factory = MainViewModel.Factory(c))
    NavHost(nav, startDestination = "main") {
        composable("main") {
            MainScreen(mainVm, onOpenDay = { nav.navigate("day/$it") }, onAddAccount = { nav.navigate("addAccount") })
        }
        composable("day/{date}") { e ->
            DayScreen(c, e.arguments?.getString("date").orEmpty(), onBack = { nav.popBackStack() })
        }
        composable("addAccount") {
            val vm: AuthViewModel = viewModel(factory = AuthViewModel.Factory(c, lang))
            val activeId = mainVm.accounts.collectAsStateWithLifecycle().value.active?.id
            val start = remember { activeId }
            // A successful sign-in changes the active account: leave the form.
            LaunchedEffect(activeId) { if (activeId != start) nav.popBackStack() }
            LoginScreen(vm, onCancel = { nav.popBackStack() })
        }
    }
}
