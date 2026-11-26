package com.hasn2mr.caredesk.admin.ui.login

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hasn2mr.caredesk.admin.R
import com.hasn2mr.caredesk.admin.ui.theme.LocalReduceMotion
import com.hasn2mr.caredesk.admin.ui.theme.neo

@Composable
fun errorText(code: String): String = stringResource(
    when (code) {
        "BAD_LOGIN" -> R.string.err_bad_login
        "LOCKED" -> R.string.err_locked
        "BANNED" -> R.string.err_banned
        "DEVICE_LIMIT" -> R.string.err_device_limit
        "OFFLINE" -> R.string.err_offline
        "BAD_USERNAME" -> R.string.err_bad_username
        "BAD_EMAIL" -> R.string.err_bad_email
        "WEAK_PASSWORD" -> R.string.err_weak_password
        "USERNAME_TAKEN" -> R.string.err_username_taken
        "EMAIL_TAKEN" -> R.string.err_email_taken
        "ACCOUNT_LIMIT" -> R.string.err_account_limit
        "EMPTY" -> R.string.err_empty
        "PASSWORD_MISMATCH" -> R.string.err_password_mismatch
        else -> R.string.err_generic
    }
)

@Composable
fun LoginScreen(vm: AuthViewModel, onCancel: (() -> Unit)? = null) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val cs = MaterialTheme.colorScheme
    val focus = LocalFocusManager.current
    val reduce = LocalReduceMotion.current

    var id by rememberSaveable { mutableStateOf("") }
    var username by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirm by rememberSaveable { mutableStateOf("") }
    var showPw by rememberSaveable { mutableStateOf(false) }

    val submit = {
        focus.clearFocus()
        if (ui.register) vm.signUp(username, email, phone, password, confirm) else vm.signIn(id, password)
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(cs.background, cs.surface, cs.background)))
            .systemBarsPadding()
            .imePadding()
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(24.dp))
            FloatingLogo()
            Spacer(Modifier.height(12.dp))
            Text(stringResource(R.string.app_name), style = MaterialTheme.typography.displaySmall, color = cs.onBackground)
            Text(
                stringResource(R.string.login_subtitle),
                style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant, textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(28.dp))

            Column(Modifier.fillMaxWidth().neo(RoundedCornerShape(28.dp), 14.dp).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                ModeSwitch(register = ui.register, onChange = vm::setRegister)

                AnimatedContent(
                    targetState = ui.register,
                    transitionSpec = {
                        (fadeIn(tween(if (reduce) 0 else 220)) + slideInVertically(tween(if (reduce) 0 else 220)) { it / 12 })
                            .togetherWith(fadeOut(tween(120)))
                    },
                    label = "authMode",
                ) { register ->
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (register) {
                            Field(username, { username = it; vm.clearError() }, stringResource(R.string.username), Icons.Outlined.Person, imeAction = ImeAction.Next, onNext = { focus.moveFocus(FocusDirection.Down) })
                            Field(email, { email = it; vm.clearError() }, stringResource(R.string.email), Icons.Outlined.Email, KeyboardType.Email, ImeAction.Next, onNext = { focus.moveFocus(FocusDirection.Down) })
                            Field(phone, { phone = it }, stringResource(R.string.phone_optional), Icons.Outlined.Phone, KeyboardType.Phone, ImeAction.Next, onNext = { focus.moveFocus(FocusDirection.Down) })
                        } else {
                            Field(id, { id = it; vm.clearError() }, stringResource(R.string.id_or_email), Icons.Outlined.Person, KeyboardType.Email, ImeAction.Next, onNext = { focus.moveFocus(FocusDirection.Down) })
                        }
                        Field(
                            password, { password = it; vm.clearError() }, stringResource(R.string.password), Icons.Outlined.Lock, KeyboardType.Password,
                            if (register) ImeAction.Next else ImeAction.Done,
                            visual = if (showPw) VisualTransformation.None else PasswordVisualTransformation(),
                            trailing = {
                                IconButton({ showPw = !showPw }) {
                                    Icon(if (showPw) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, null)
                                }
                            },
                            onNext = { focus.moveFocus(FocusDirection.Down) }, onDone = { submit() },
                        )
                        if (register) {
                            Field(confirm, { confirm = it; vm.clearError() }, stringResource(R.string.confirm_password), Icons.Outlined.Lock, KeyboardType.Password, ImeAction.Done,
                                visual = if (showPw) VisualTransformation.None else PasswordVisualTransformation(), onDone = { submit() })
                            Text(stringResource(R.string.password_hint), style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
                        }
                    }
                }

                AnimatedVisibility(ui.errorCode != null, enter = fadeIn() + slideInVertically { -it / 2 }, exit = fadeOut()) {
                    Text(
                        errorText(ui.errorCode ?: "ERR"),
                        color = cs.error, style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(cs.error.copy(alpha = 0.12f)).padding(12.dp),
                    )
                }

                Button(
                    onClick = { submit() },
                    enabled = !ui.loading,
                    shape = RoundedCornerShape(18.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = cs.primary, contentColor = cs.onPrimary),
                    modifier = Modifier.fillMaxWidth().height(54.dp).shadow(8.dp, RoundedCornerShape(18.dp), spotColor = cs.primary.copy(alpha = 0.5f)),
                ) {
                    if (ui.loading) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.5.dp, color = cs.onPrimary)
                    else Text(stringResource(if (ui.register) R.string.create_account else R.string.sign_in), style = MaterialTheme.typography.titleMedium)
                }
            }

            if (onCancel != null) {
                Spacer(Modifier.height(12.dp))
                Text(stringResource(R.string.cancel), color = cs.onSurfaceVariant, modifier = Modifier.clickable { onCancel() }.padding(12.dp))
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun FloatingLogo() {
    val still = LocalReduceMotion.current
    val t = rememberInfiniteTransition(label = "logo")
    val dy by t.animateFloat(0f, if (still) 0f else -8f, infiniteRepeatable(tween(2600), RepeatMode.Reverse), label = "dy")
    Image(
        painterResource(R.drawable.ic_launcher_foreground),
        contentDescription = null,
        modifier = Modifier.size(132.dp).graphicsLayer { translationY = dy * density },
    )
}

@Composable
private fun ModeSwitch(register: Boolean, onChange: (Boolean) -> Unit) {
    val cs = MaterialTheme.colorScheme
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(cs.background.copy(alpha = 0.55f)).padding(4.dp)) {
        listOf(false to R.string.sign_in, true to R.string.create_account).forEach { (isReg, label) ->
            val sel = register == isReg
            Box(
                Modifier.weight(1f).clip(RoundedCornerShape(12.dp))
                    .background(if (sel) cs.primary else cs.background.copy(alpha = 0f))
                    .clickable { onChange(isReg) }.padding(vertical = 11.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(stringResource(label), style = MaterialTheme.typography.labelLarge, color = if (sel) cs.onPrimary else cs.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun Field(
    value: String, onChange: (String) -> Unit, label: String, icon: androidx.compose.ui.graphics.vector.ImageVector,
    keyboard: KeyboardType = KeyboardType.Text, imeAction: ImeAction = ImeAction.Next,
    visual: VisualTransformation = VisualTransformation.None, trailing: @Composable (() -> Unit)? = null,
    onNext: () -> Unit = {}, onDone: () -> Unit = {},
) {
    val cs = MaterialTheme.colorScheme
    OutlinedTextField(
        value = value, onValueChange = onChange, label = { Text(label) }, singleLine = true,
        leadingIcon = { Icon(icon, null) }, trailingIcon = trailing, visualTransformation = visual,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard, imeAction = imeAction),
        keyboardActions = KeyboardActions(onNext = { onNext() }, onDone = { onDone() }),
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = cs.primary, unfocusedBorderColor = cs.outline,
            focusedLabelColor = cs.primary, cursorColor = cs.primary,
            focusedContainerColor = cs.background.copy(alpha = 0.35f), unfocusedContainerColor = cs.background.copy(alpha = 0.35f),
        ),
        modifier = Modifier.fillMaxWidth(),
    )
}
