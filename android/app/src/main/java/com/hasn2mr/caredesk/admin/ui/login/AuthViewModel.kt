package com.hasn2mr.caredesk.admin.ui.login

import android.os.Build
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.hasn2mr.caredesk.admin.AppContainer
import com.hasn2mr.caredesk.admin.data.AuthResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AuthUi(
    val register: Boolean = false,
    val loading: Boolean = false,
    val errorCode: String? = null,
)

class AuthViewModel(private val c: AppContainer, private val lang: String) : ViewModel() {
    private val _ui = MutableStateFlow(AuthUi())
    val ui: StateFlow<AuthUi> = _ui

    private val device get() = "${Build.MANUFACTURER} ${Build.MODEL}".trim()

    fun setRegister(on: Boolean) = _ui.update { it.copy(register = on, errorCode = null) }
    fun clearError() = _ui.update { it.copy(errorCode = null) }

    fun signIn(id: String, password: String) {
        if (id.isBlank() || password.isEmpty()) return fail("EMPTY")
        run { c.repo.login(id, password, device) }
    }

    fun signUp(username: String, email: String, phone: String, password: String, confirm: String) {
        when {
            username.isBlank() || email.isBlank() || password.isEmpty() -> return fail("EMPTY")
            password != confirm -> return fail("PASSWORD_MISMATCH")
        }
        run { c.repo.register(username, email, phone, password, lang, device) }
    }

    private fun fail(code: String) = _ui.update { it.copy(errorCode = code) }

    private fun run(block: suspend () -> AuthResult) {
        if (_ui.value.loading) return
        _ui.update { it.copy(loading = true, errorCode = null) }
        viewModelScope.launch {
            val r = block()
            // On success the active account changes and the root composable switches to the main screen by itself.
            _ui.update { it.copy(loading = false, errorCode = (r as? AuthResult.Error)?.code) }
        }
    }

    class Factory(private val c: AppContainer, private val lang: String) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = AuthViewModel(c, lang) as T
    }
}
