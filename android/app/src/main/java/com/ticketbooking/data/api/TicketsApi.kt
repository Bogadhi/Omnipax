package com.ticketbooking.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import com.google.gson.annotations.SerializedName

interface TicketsApi {
    @POST("tickets/scan")
    suspend fun scanTicket(@Body payload: ScanTicketDto): Response<ScanResponse>
}

data class ScanTicketDto(
    @SerializedName("qrToken") val qrToken: String,
    @SerializedName("deviceId") val deviceId: String? = null
)

data class ScanResponse(
    @SerializedName("status") val status: String,
    @SerializedName("message") val message: String?,
    @SerializedName("ticketId") val ticketId: String?,
    @SerializedName("eventName") val eventName: String?,
    @SerializedName("seatNumber") val seatNumber: String?
)
