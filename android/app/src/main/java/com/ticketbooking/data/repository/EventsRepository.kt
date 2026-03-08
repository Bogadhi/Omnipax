package com.ticketbooking.data.repository

import com.ticketbooking.data.api.EventDto
import com.ticketbooking.data.api.EventsApi
import com.ticketbooking.data.api.EventsResponse
import com.ticketbooking.utils.ApiResult
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EventsRepository @Inject constructor(
    private val eventsApi: EventsApi
) : BaseRepository() {

    suspend fun getEvents(): ApiResult<List<EventDto>> {
        return safeApiCall {
            val response = com.ticketbooking.network.RetrofitClient.apiService.getEvents()
            Response.success(response.body()?.data ?: emptyList())
        }
    }

    suspend fun getEventById(id: String): ApiResult<EventDto> {
        return safeApiCall {
            com.ticketbooking.network.RetrofitClient.apiService.getEventById(id)
        }
    }
}
