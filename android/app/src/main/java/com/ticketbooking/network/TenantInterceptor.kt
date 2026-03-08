package com.ticketbooking.network

import okhttp3.Interceptor
import okhttp3.Response

class TenantInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val newRequest = originalRequest.newBuilder()
            .addHeader("x-tenant-slug", "starpass")
            .build()

        return chain.proceed(newRequest)
    }
}