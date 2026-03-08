package com.ticketbooking.network

import com.ticketbooking.data.api.EventsResponse
import retrofit2.Response
import retrofit2.http.GET

interface ApiService {
    @GET("events")
    suspend fun getEvents(): Response<EventsResponse>

    @GET("events/{id}")
    suspend fun getEventById(@retrofit2.http.Path("id") id: String): Response<com.ticketbooking.data.api.EventDto>

}
