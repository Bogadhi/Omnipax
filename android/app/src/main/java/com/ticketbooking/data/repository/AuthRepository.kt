package com.ticketbooking.data.repository

import com.ticketbooking.data.api.AuthApi
import com.ticketbooking.data.api.LoginResponse
import com.ticketbooking.data.api.LoginOtpRequest
import com.ticketbooking.data.api.OtpRequestResponse
import com.ticketbooking.data.api.RequestOtpRequest
import com.ticketbooking.utils.ApiResult
import com.ticketbooking.utils.TokenManager
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val tokenManager: TokenManager
) : BaseRepository() {

    // Step 1: Request an OTP to be delivered to user's email
    suspend fun requestOtp(email: String): ApiResult<OtpRequestResponse> {
        return safeApiCall {
            authApi.requestOtp(RequestOtpRequest(email = email))
        }
    }

    // Step 2: Submit the OTP to authenticate and get a JWT
    suspend fun loginWithOtp(email: String, otp: String): ApiResult<LoginResponse> {
        return safeApiCall {
            authApi.loginWithOtp(LoginOtpRequest(email = email, otp = otp))
        }
    }

    fun saveToken(token: String?) {
        if (!token.isNullOrBlank()) {
            tokenManager.saveToken(token)
        }
    }
}
