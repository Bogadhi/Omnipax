package com.ticketbooking.network

import com.ticketbooking.data.api.AuthApi
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {

    private const val BASE_URL = "http://10.0.2.2:5001/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val tenantInterceptor = TenantInterceptor()

    private val okHttpClient = OkHttpClient.Builder()
    .addInterceptor(tenantInterceptor)
    .addInterceptor(loggingInterceptor)
    .build()

    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    // 🔹 General APIs (Events, Booking, etc.)
    val apiService: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }

    // 🔹 Auth APIs
    val authApi: AuthApi by lazy {
        retrofit.create(AuthApi::class.java)
    }
}