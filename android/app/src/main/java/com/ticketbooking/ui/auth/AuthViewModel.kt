package com.ticketbooking.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import android.util.Log
import com.ticketbooking.data.api.LoginResponse
import com.ticketbooking.data.repository.AuthRepository
import com.ticketbooking.ui.base.UiState
import com.ticketbooking.utils.ApiResult
import com.ticketbooking.utils.SocketManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * OTP Auth flow:
 *   Step 1 → user enters email → call requestOtp()
 *   Step 2 → user enters OTP  → call submitOtp()
 */
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val socketManager: SocketManager
) : ViewModel() {

    // Login state tracks the final JWT response
    private val _loginState = MutableStateFlow<UiState<LoginResponse>>(UiState.Idle)
    val loginState: StateFlow<UiState<LoginResponse>> = _loginState.asStateFlow()

    // OTP request state (step 1 confirmation)
    private val _otpRequestState = MutableStateFlow<UiState<String>>(UiState.Idle)
    val otpRequestState: StateFlow<UiState<String>> = _otpRequestState.asStateFlow()

    fun requestOtp(email: String) {
        viewModelScope.launch {
            _otpRequestState.value = UiState.Loading
            when (val result = authRepository.requestOtp(email)) {
                is ApiResult.Success -> {
                    Log.d("AUTH_DEBUG", "OTP requested for $email")
                    _otpRequestState.value = UiState.Success("OTP sent to $email")
                }
                is ApiResult.Error -> {
                    Log.e("AUTH_DEBUG", "OTP request failed: ${result.message}")
                    _otpRequestState.value = UiState.Error(result.message)
                }
                else -> {}
            }
        }
    }

    fun submitOtp(email: String, otp: String) {
        viewModelScope.launch {
            try {
                _loginState.value = UiState.Loading

                when (val result = authRepository.loginWithOtp(email, otp)) {
                    is ApiResult.Success -> {
                        val response = result.data
                        Log.d("AUTH_DEBUG", "Login success: ${response.user?.email}")

                        val token = response.accessToken
                        if (!token.isNullOrBlank()) {
                            authRepository.saveToken(token)
                            socketManager.connect()
                            _loginState.value = UiState.Success(response)
                        } else {
                            Log.e("AUTH_DEBUG", "Token is null or blank")
                            _loginState.value = UiState.Error("Invalid server response")
                        }
                    }
                    is ApiResult.Error -> {
                        Log.e("AUTH_DEBUG", "OTP login error: ${result.message}")
                        _loginState.value = UiState.Error(result.message)
                    }
                    else -> {}
                }
            } catch (e: Exception) {
                Log.e("AUTH_DEBUG", "Unexpected crash: ${e.message}", e)
                _loginState.value = UiState.Error("Something went wrong. Please try again.")
            }
        }
    }

    fun resetStates() {
        _loginState.value = UiState.Idle
        _otpRequestState.value = UiState.Idle
    }
}