package com.ticketbooking.data.repository

import com.ticketbooking.data.api.BookingApi
import com.ticketbooking.data.api.BookingDto
import com.ticketbooking.data.api.BookingResponse
import com.ticketbooking.data.api.CreateBookingPayload
import com.ticketbooking.data.api.PaymentVerificationPayload
import com.ticketbooking.utils.ApiResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BookingRepository @Inject constructor(
    private val bookingApi: BookingApi
) : BaseRepository() {

    suspend fun createBooking(
        eventId: String,
        seats: List<String>,
        idempotencyKey: String
    ): ApiResult<BookingResponse> {
        return safeApiCall {
            bookingApi.createBooking(
                idempotencyKey = idempotencyKey,
                payload = CreateBookingPayload(
                    showId = eventId, 
                    seatNumbers = seats
                )
            )
        }
    }

    suspend fun verifyPayment(
        bookingId: String,
        orderId: String,
        paymentId: String,
        signature: String
    ): ApiResult<BookingDto> {
        return safeApiCall {
            bookingApi.verifyPayment(
                PaymentVerificationPayload(bookingId, orderId, paymentId, signature)
            )
        }
    }

    suspend fun cancelBooking(bookingId: String): ApiResult<Unit> {
        return safeApiCall {
            bookingApi.cancelBooking(bookingId)
        }
    }

    suspend fun getMyBookings(): ApiResult<List<com.ticketbooking.data.api.BookingHistoryDto>> {
        return safeApiCall {
            bookingApi.getMyBookings()
        }
    }

    suspend fun getBookingById(bookingId: String): ApiResult<com.ticketbooking.data.api.BookingHistoryDto> {
        return safeApiCall {
            bookingApi.getBookingById(bookingId)
        }
    }
}
