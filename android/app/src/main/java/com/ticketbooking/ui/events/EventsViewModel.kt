package com.ticketbooking.ui.events

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ticketbooking.data.api.EventDto
import com.ticketbooking.data.repository.EventsRepository
import com.ticketbooking.ui.base.UiState
import com.ticketbooking.utils.ApiResult
import com.ticketbooking.utils.SocketManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import javax.inject.Inject

@HiltViewModel
class EventsViewModel @Inject constructor(
    private val eventsRepository: EventsRepository,
    private val socketManager: SocketManager
) : ViewModel() {

    private val _eventsState = MutableStateFlow<UiState<List<EventDto>>>(UiState.Idle)
    val eventsState: StateFlow<UiState<List<EventDto>>> = _eventsState.asStateFlow()

    private val _eventDetailState = MutableStateFlow<UiState<EventDto>>(UiState.Idle)
    val eventDetailState: StateFlow<UiState<EventDto>> = _eventDetailState.asStateFlow()

    private val _realtimeSeats = MutableStateFlow<Int?>(null)
    val realtimeSeats: StateFlow<Int?> = _realtimeSeats.asStateFlow()
    
    // Listener reference for cleanup
    private var seatUpdateListener: ((Array<Any>) -> Unit)? = null

    fun loadEvents() {
        viewModelScope.launch {
            _eventsState.value = UiState.Loading
            when (val result = eventsRepository.getEvents()) {
                is ApiResult.Success -> _eventsState.value = UiState.Success(result.data)
                is ApiResult.Error -> _eventsState.value = UiState.Error(result.message)
                else -> {}
            }
        }
    }

    fun loadEventDetails(id: String) {
        viewModelScope.launch {
            _eventDetailState.value = UiState.Loading
            _realtimeSeats.value = null
            when (val result = eventsRepository.getEventById(id)) {
                is ApiResult.Success -> {
                    _eventDetailState.value = UiState.Success(result.data)
                    subscribeToSeatUpdates(id)
                }
                is ApiResult.Error -> _eventDetailState.value = UiState.Error(result.message)
                else -> {}
            }
        }
    }

    private fun subscribeToSeatUpdates(eventId: String) {
        if (seatUpdateListener != null) return // Already subscribed
        
        val socket = socketManager.getSocket() ?: return

        seatUpdateListener = { args ->
            if (args.isNotEmpty()) {
                try {
                    val data = args[0] as JSONObject
                    if (data.getString("eventId") == eventId) {
                        _realtimeSeats.value = data.getInt("availableSeats")
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
        
        socket.on("event:seats-update", seatUpdateListener)
    }

    fun unsubscribeFromSeatUpdates() {
        seatUpdateListener?.let {
            socketManager.getSocket()?.off("event:seats-update", it)
            seatUpdateListener = null
        }
    }

    override fun onCleared() {
        super.onCleared()
        unsubscribeFromSeatUpdates()
    }
}
