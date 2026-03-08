package com.ticketbooking.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import com.google.gson.annotations.SerializedName

interface AuthApi {

    // Step 1: Request OTP to be sent to email
    @POST("auth/otp/request")
    suspend fun requestOtp(
        @Body request: RequestOtpRequest
    ): Response<OtpRequestResponse>

    // Step 2: Submit OTP to get access_token
    @POST("auth/login")
    suspend fun loginWithOtp(
        @Body request: LoginOtpRequest
    ): Response<LoginResponse>
}

data class RequestOtpRequest(
    @SerializedName("email") val email: String
)

data class OtpRequestResponse(
    @SerializedName("message") val message: String
)

data class LoginOtpRequest(
    @SerializedName("email") val email: String,
    @SerializedName("otp") val otp: String
)

data class LoginResponse(
    @SerializedName("access_token")
    val accessToken: String?,

    @SerializedName("user")
    val user: UserDto?
)

data class UserDto(
    @SerializedName("id")
    val id: String,

    @SerializedName("email")
    val email: String,

    @SerializedName("name")
    val name: String?,

    @SerializedName("role")
    val role: String,

    @SerializedName("tenantId")
    val tenantId: String?,

    @SerializedName("theaterId")
    val theaterId: String?
)