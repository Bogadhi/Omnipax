package com.ticketbooking.di

import com.ticketbooking.data.api.AuthInterceptor
import com.ticketbooking.utils.TokenManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(com.ticketbooking.network.TenantInterceptor())
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(com.ticketbooking.BuildConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): com.ticketbooking.data.api.AuthApi {
        return retrofit.create(com.ticketbooking.data.api.AuthApi::class.java)
    }

    @Provides
    @Singleton
    fun provideEventsApi(retrofit: Retrofit): com.ticketbooking.data.api.EventsApi {
        return retrofit.create(com.ticketbooking.data.api.EventsApi::class.java)
    }

    @Provides
    @Singleton
    fun provideBookingApi(retrofit: Retrofit): com.ticketbooking.data.api.BookingApi {
        return retrofit.create(com.ticketbooking.data.api.BookingApi::class.java)
    }

    @Provides
    @Singleton
    fun provideTicketsApi(retrofit: Retrofit): com.ticketbooking.data.api.TicketsApi {
        return retrofit.create(com.ticketbooking.data.api.TicketsApi::class.java)
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): com.ticketbooking.network.ApiService {
        return retrofit.create(com.ticketbooking.network.ApiService::class.java)
    }
}
