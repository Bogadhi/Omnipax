package com.ticketbooking.data.api

import com.ticketbooking.utils.TokenManager
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val token = tokenManager.getToken()
        val tenantSlug = tokenManager.getTenantSlug()

        val requestBuilder = originalRequest.newBuilder()
            .header("x-tenant-slug", tenantSlug)

        if (token != null) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        val response = chain.proceed(requestBuilder.build())
        
        if (response.code == 401) {
            tokenManager.triggerLogout()
        }
        
        return response
    }
}
