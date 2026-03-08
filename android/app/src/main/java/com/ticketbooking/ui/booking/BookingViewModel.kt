package com.ticketbooking.ui.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ticketbooking.data.api.BookingDto
import com.ticketbooking.data.api.BookingResponse
import com.ticketbooking.data.repository.BookingRepository
import com.ticketbooking.ui.base.UiState
import com.ticketbooking.utils.ApiResult
import com.ticketbooking.utils.SocketManager
import com.ticketbooking.utils.PaymentManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import com.ticketbooking.utils.PaymentResult
import kotlinx.coroutines.flow.collectLatest
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject

data class BookingUiState(
    val seats: List<com.ticketbooking.data.api.SeatAvailabilityDto> = emptyList(),
    val selectedSeats: Set<String> = emptySet(),
    val unavailableSeats: Set<String> = emptySet(),
    val bookingState: UiState<BookingResponse> = UiState.Idle,
    val paymentVerificationState: UiState<String> = UiState.Idle,
    val isLoadingSeats: Boolean = false,
    val seatingError: String? = null
)

@HiltViewModel
class BookingViewModel @Inject constructor(
    private val bookingRepository: BookingRepository,
    private val eventsRepository: com.ticketbooking.data.repository.EventsRepository,
    private val socketManager: SocketManager,
    private val paymentManager: PaymentManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(BookingUiState())
    val uiState: StateFlow<BookingUiState> = _uiState.asStateFlow()

    private val _paymentLaunchEvent = kotlinx.coroutines.channels.Channel<BookingResponse>(kotlinx.coroutines.channels.Channel.BUFFERED)
    val paymentLaunchEvent = _paymentLaunchEvent.receiveAsFlow()

    private val _bookingDetails = MutableStateFlow<UiState<com.ticketbooking.data.api.BookingHistoryDto>>(UiState.Idle)
    val bookingDetails: StateFlow<UiState<com.ticketbooking.data.api.BookingHistoryDto>> = _bookingDetails.asStateFlow()

    private var seatUpdateListener: ((Array<Any>) -> Unit)? = null
    private val isPaymentProcessing = AtomicBoolean(false)

    init {
        viewModelScope.launch {
            paymentManager.paymentResults.collectLatest { result ->
                when (result) {
                    is PaymentResult.Success -> {
                        android.util.Log.d("PAYMENT_DEBUG", "Razorpay Success received")
                        onPaymentSuccess(result.paymentId, result.signature)
                    }
                    is PaymentResult.Error -> {
                        android.util.Log.e("PAYMENT_DEBUG", "Razorpay Error: ${result.message}")
                        _uiState.value = _uiState.value.copy(
                            paymentVerificationState = UiState.Error(result.message)
                        )
                        cancelCurrentBooking()
                    }
                    else -> {}
                }
            }
        }
    }

    fun selectSeat(seatId: String) {
        val current = _uiState.value.selectedSeats
        _uiState.value = if (current.contains(seatId)) {
            _uiState.value.copy(selectedSeats = current - seatId)
        } else {
            if (current.size >= 6) return
            _uiState.value.copy(selectedSeats = current + seatId)
        }
    }

    fun initiateBooking(showId: String) {
        val seats = _uiState.value.selectedSeats.toList()
        android.util.Log.d("SEAT_DEBUG", "initiateBooking invoked. ShowId: $showId, Seats: $seats")
        if (seats.isEmpty()) return

        val idempotencyKey = UUID.randomUUID().toString()
        viewModelScope.launch {
            android.util.Log.d("SEAT_DEBUG", "Booking state set to Loading")
            _uiState.value = _uiState.value.copy(
                bookingState = UiState.Loading,
                paymentVerificationState = UiState.Idle
            )

            android.util.Log.d("SEAT_DEBUG", "Repository call started")
            val result = bookingRepository.createBooking(showId, seats, idempotencyKey)
            android.util.Log.d("SEAT_DEBUG", "Repository call finished: $result")

            when (result) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        bookingState = UiState.Success(result.data)
                    )
                    _paymentLaunchEvent.send(result.data)
                }
                is ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        bookingState = UiState.Error(result.message)
                    )
                }
                is ApiResult.Loading -> {
                    // Already set in UI state above
                }
            }
        }
    }

    fun onPaymentSuccess(paymentId: String, signature: String) {
        val bookingData = (_uiState.value.bookingState as? UiState.Success)?.data ?: return

        // Prevent double execution race conditions
        if (!isPaymentProcessing.compareAndSet(false, true)) {
            android.util.Log.w("PAYMENT_DEBUG", "Duplicate payment success received, ignoring.")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                paymentVerificationState = UiState.Loading
            )

            val response = bookingRepository.verifyPayment(
                bookingId = bookingData.bookingId,
                orderId = bookingData.orderId,
                paymentId = paymentId,
                signature = signature
            )

            _uiState.value = _uiState.value.copy(
                paymentVerificationState = when(response) {
                    is ApiResult.Success -> {
                        android.util.Log.d("PAYMENT_DEBUG", "Verified booking ID: ${response.data.id}")
                        UiState.Success(response.data.id)
                    }
                    is ApiResult.Error -> {
                        isPaymentProcessing.set(false) // Allow retry if backend verification failed
                        UiState.Error(response.message)
                    }
                    is ApiResult.Loading -> UiState.Loading
                }
            )
        }
    }

    fun handlePaymentLaunchError(error: String) {
        android.util.Log.e("PAYMENT_DEBUG", "Handling payment launch error: $error")
        _uiState.value = _uiState.value.copy(
            paymentVerificationState = UiState.Error(error)
        )
        cancelCurrentBooking()
    }

    fun resetBookingState() {
        isPaymentProcessing.set(false)
        _uiState.value = _uiState.value.copy(
            bookingState = UiState.Idle,
            paymentVerificationState = UiState.Idle,
            selectedSeats = emptySet()
        )
    }

    private fun cancelCurrentBooking() {
        val bookingData = (_uiState.value.bookingState as? UiState.Success)?.data ?: return
        android.util.Log.d("PAYMENT_DEBUG", "Canceling booking locally to release seat locks: ${bookingData.bookingId}")
        viewModelScope.launch {
            bookingRepository.cancelBooking(bookingData.bookingId)
            resetBookingState()
        }
    }

    /**
     * Maps a seatId UUID to the seat code string (e.g. "A5") by looking up the
     * currently loaded seats list. Falls back to the raw UUID if not found for safety,
     * but this should never happen in practice.
     */
    private fun uuidToSeatCode(seatId: String): String {
        val avail = _uiState.value.seats.find { it.seatId == seatId }
        return avail?.let { "${it.seat?.row ?: ""}${it.seat?.number ?: ""}" } ?: seatId
    }

    fun subscribeToSeatUpdates(showId: String) {
        val socket = socketManager.getSocket() ?: return
        
        socket.emit("join_show", JSONObject().apply { put("showId", showId) })
        
        socket.on("seat_locked") { args ->
            val data = args[0] as JSONObject
            if (data.getString("showId") == showId) {
                val seatCode = uuidToSeatCode(data.getString("seatId"))
                viewModelScope.launch {
                    _uiState.value = _uiState.value.copy(
                        unavailableSeats = _uiState.value.unavailableSeats + seatCode,
                        selectedSeats   = _uiState.value.selectedSeats   - seatCode
                    )
                }
            }
        }

        socket.on("seat_released") { args ->
            val data = args[0] as JSONObject
            if (data.getString("showId") == showId) {
                val seatCode = uuidToSeatCode(data.getString("seatId"))
                viewModelScope.launch {
                    _uiState.value = _uiState.value.copy(
                        unavailableSeats = _uiState.value.unavailableSeats - seatCode
                    )
                }
            }
        }

        socket.on("seat_booked") { args ->
            val data = args[0] as JSONObject
            if (data.getString("showId") == showId) {
                val seatCode = uuidToSeatCode(data.getString("seatId"))
                viewModelScope.launch {
                    _uiState.value = _uiState.value.copy(
                        unavailableSeats = _uiState.value.unavailableSeats + seatCode,
                        selectedSeats   = _uiState.value.selectedSeats   - seatCode
                    )
                }
            }
        }

        socket.on("booking_confirmed") { args ->
            val data = args[0] as JSONObject
            if (data.getString("showId") == showId) {
                val seatsJson = data.getJSONArray("seatIds")
                val confirmedCodes = mutableSetOf<String>()
                for (i in 0 until seatsJson.length()) {
                    confirmedCodes.add(uuidToSeatCode(seatsJson.getString(i)))
                }
                viewModelScope.launch {
                    _uiState.value = _uiState.value.copy(
                        unavailableSeats = _uiState.value.unavailableSeats + confirmedCodes,
                        selectedSeats   = _uiState.value.selectedSeats   - confirmedCodes
                    )
                }
            }
        }
    }

    fun unsubscribeFromSeatUpdates() {
        val socket = socketManager.getSocket()
        socket?.off("seat_locked")
        socket?.off("seat_released")
        socket?.off("seat_booked")
        socket?.off("booking_confirmed")
    }

    override fun onCleared() {
        super.onCleared()
        unsubscribeFromSeatUpdates()
    }

    fun loadSeats(eventId: String, showId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoadingSeats = true, 
                seatingError = null,
                seats = emptyList(),
                selectedSeats = emptySet(),
                unavailableSeats = emptySet(),
                bookingState = UiState.Idle,
                paymentVerificationState = UiState.Idle
            )
            val result = eventsRepository.getEventById(eventId)
            if (result is ApiResult.Success) {
                android.util.Log.d("SEAT_DEBUG", "Event loaded: ${result.data.id} - ${result.data.title}")
                val show = result.data.shows?.find { it.id == showId }
                if (show == null) {
                    android.util.Log.e("SEAT_DEBUG", "Show NOT FOUND: $showId in ${result.data.shows?.size} shows")
                    _uiState.value = _uiState.value.copy(
                        isLoadingSeats = false,
                        seatingError = "Show not found: $showId"
                    )
                    return@launch
                }
                
                val seats = show.seatAvailability ?: emptyList()
                val seatsWithDetails = seats.filter { it.seat != null }
                android.util.Log.d("SEAT_DEBUG", "Total seats: ${seats.size}, Seats with details: ${seatsWithDetails.size}")
                
                if (seats.isEmpty()) {
                    _uiState.value = _uiState.value.copy(
                        isLoadingSeats = false,
                        seatingError = "No seats available for this show"
                    )
                    return@launch
                }
                
                // Build unavailableSeats with seat CODE strings (e.g. "A1") NOT UUIDs.
                // SeatGrid and the booking API both expect this format.
                val booked = seats
                    .filter { it.status != "AVAILABLE" }
                    .mapNotNull { avail ->
                        val row = avail.seat?.row ?: return@mapNotNull null
                        val num = avail.seat?.number ?: return@mapNotNull null
                        "$row$num"
                    }
                    .toSet()

                _uiState.value = _uiState.value.copy(
                    seats = seats,
                    unavailableSeats = _uiState.value.unavailableSeats + booked,
                    isLoadingSeats = false
                )
            } else if (result is ApiResult.Error) {
                android.util.Log.e("SEAT_DEBUG", "Failed to load event: ${result.message}")
                _uiState.value = _uiState.value.copy(
                    isLoadingSeats = false,
                    seatingError = "Failed to load seats: ${result.message}"
                )
            }
        }
    }

    fun fetchBookingDetails(bookingId: String) {
        viewModelScope.launch {
            _bookingDetails.value = UiState.Loading
            val result = bookingRepository.getBookingById(bookingId)
            _bookingDetails.value = when (result) {
                is ApiResult.Success -> UiState.Success(result.data)
                is ApiResult.Error -> UiState.Error(result.message)
                is ApiResult.Loading -> UiState.Loading
            }
        }
    }
}