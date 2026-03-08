package com.ticketbooking.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ticketbooking.ui.base.UiState

/**
 * Two-step OTP login screen:
 *  Screen 1: Enter email → tap "Send OTP"
 *  Screen 2: Enter 6-digit OTP → tap "Verify"
 */
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    var email by remember { mutableStateOf("") }
    var otpCode by remember { mutableStateOf("") }
    var otpSent by remember { mutableStateOf(false) }

    val otpRequestState by viewModel.otpRequestState.collectAsState()
    val loginState by viewModel.loginState.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }

    // Handle OTP request result
    LaunchedEffect(otpRequestState) {
        when (otpRequestState) {
            is UiState.Success -> {
                otpSent = true
                snackbarHostState.showSnackbar("OTP sent to $email")
            }
            is UiState.Error -> {
                snackbarHostState.showSnackbar((otpRequestState as UiState.Error).message)
            }
            else -> {}
        }
    }

    // Handle final login result
    LaunchedEffect(loginState) {
        when (loginState) {
            is UiState.Success -> onLoginSuccess()
            is UiState.Error -> {
                snackbarHostState.showSnackbar((loginState as UiState.Error).message)
            }
            else -> {}
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(hostState = snackbarHostState) }) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = if (otpSent) "Enter OTP" else "Welcome Back",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                Text(
                    text = if (otpSent) "Check $email for your one-time code" else "Sign in with your email",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 32.dp)
                )

                if (!otpSent) {
                    // ── Step 1: Email ──
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it.trim() },
                        label = { Text("Email Address") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { viewModel.requestOtp(email) },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        enabled = email.isNotBlank() && otpRequestState !is UiState.Loading
                    ) {
                        if (otpRequestState is UiState.Loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text("Send OTP")
                        }
                    }
                } else {
                    // ── Step 2: OTP ──
                    OutlinedTextField(
                        value = otpCode,
                        onValueChange = { if (it.length <= 6) otpCode = it },
                        label = { Text("One-Time Password") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { viewModel.submitOtp(email, otpCode) },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        enabled = otpCode.length == 6 && loginState !is UiState.Loading
                    ) {
                        if (loginState is UiState.Loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text("Verify & Login")
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    TextButton(onClick = {
                        otpSent = false
                        otpCode = ""
                        viewModel.resetStates()
                    }) {
                        Text("← Change Email")
                    }
                }
            }
        }
    }
}
