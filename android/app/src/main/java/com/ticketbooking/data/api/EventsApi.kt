package com.ticketbooking.data.api

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import com.google.gson.annotations.SerializedName

interface EventsApi {
    @GET("events")
    suspend fun getEvents(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10
    ): Response<EventsResponse>

    @GET("events/{id}")
    suspend fun getEventById(@Path("id") id: String): Response<EventDto>
}

data class EventsResponse(
    @SerializedName("data") val data: List<EventDto>,
    @SerializedName("meta") val meta: MetaDto
)

data class MetaDto(
    @SerializedName("total") val total: Int,
    @SerializedName("page") val page: Int,
    @SerializedName("lastPage") val lastPage: Int
)

data class EventDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String?,
    @SerializedName("description") val description: String?,
    @SerializedName("date") val date: String?,
    @SerializedName("location") val location: String?,
    @SerializedName("price") val price: Int,
    @SerializedName("totalSeats") val totalSeats: Int,
    @SerializedName("availableSeats") val availableSeats: Int,
    @SerializedName("imageUrl") val imageUrl: String?,
    @SerializedName("shows") val shows: List<ShowDto>? = null
)

data class ShowDto(
    @SerializedName("id") val id: String,
    @SerializedName("startTime") val startTime: String?,
    @SerializedName("seatAvailability") val seatAvailability: List<SeatAvailabilityDto>? = null
)

data class SeatAvailabilityDto(
    @SerializedName("seatId") val seatId: String,
    @SerializedName("status") val status: String,
    @SerializedName("seat") val seat: SeatDetailsDto? = null
)

data class SeatDetailsDto(
    @SerializedName("row") val row: String,
    @SerializedName("number") val number: Int
)
