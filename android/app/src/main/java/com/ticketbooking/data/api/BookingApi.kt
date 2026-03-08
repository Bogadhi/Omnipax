package com.ticketbooking.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import com.google.gson.annotations.SerializedName

interface BookingApi {
    @POST("bookings/lock")
    suspend fun createBooking(
        @Header("Idempotency-Key") idempotencyKey: String,
        @Body payload: CreateBookingPayload
    ): Response<BookingResponse>

    @POST("bookings/confirm")
    suspend fun verifyPayment(
        @Body payload: PaymentVerificationPayload
    ): Response<BookingDto>

    @POST("bookings/{id}/cancel")
    suspend fun cancelBooking(
        @retrofit2.http.Path("id") bookingId: String
    ): Response<Unit>

    @retrofit2.http.GET("bookings/my-bookings")
    suspend fun getMyBookings(): Response<List<BookingHistoryDto>>

    @retrofit2.http.GET("bookings/{id}")
    suspend fun getBookingById(
        @retrofit2.http.Path("id") id: String
    ): Response<BookingHistoryDto>
}

data class CreateBookingPayload(
    @SerializedName("showId") val showId: String,
    @SerializedName("seatNumbers") val seatNumbers: List<String>
)

data class BookingResponse(
    @SerializedName("bookingId") val bookingId: String,
    @SerializedName("status") val status: String? = null,
    @SerializedName("razorpayOrderId") val orderId: String,
    @SerializedName("amount") val amount: Int,
    @SerializedName("currency") val currency: String
)

data class PaymentVerificationPayload(
    @SerializedName("bookingId") val bookingId: String,
    @SerializedName("razorpayOrderId") val razorpayOrderId: String,
    @SerializedName("razorpayPaymentId") val razorpayPaymentId: String,
    @SerializedName("razorpaySignature") val razorpaySignature: String
)

data class BookingDto(
    @SerializedName("id") val id: String,
    @SerializedName("status") val status: String
)

data class BookingHistoryDto(
    @SerializedName("id") val id: String,
    @SerializedName("totalAmount") val totalAmount: String,
    @SerializedName("status") val status: String,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("show") val show: ShowHistoryDto,
    @SerializedName("bookingSeats") val bookingSeats: List<BookingSeatHistoryDto>
)

data class ShowHistoryDto(
    @SerializedName("id") val id: String,
    @SerializedName("startTime") val startTime: String,
    @SerializedName("event") val event: EventHistoryDto
)

data class EventHistoryDto(
    @SerializedName("title") val title: String,
    @SerializedName("imageUrl") val imageUrl: String?
)

data class BookingSeatHistoryDto(
    @SerializedName("seat") val seat: SeatHistoryDto
)

data class SeatHistoryDto(
    @SerializedName("row") val row: String,
    @SerializedName("number") val number: Int
)
