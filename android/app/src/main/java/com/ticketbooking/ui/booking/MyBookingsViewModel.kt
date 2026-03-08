package com.ticketbooking.ui.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ticketbooking.data.api.BookingHistoryDto
import com.ticketbooking.data.repository.BookingRepository
import com.ticketbooking.ui.base.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import com.ticketbooking.utils.ApiResult
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MyBookingsViewModel @Inject constructor(
    private val bookingRepository: BookingRepository
) : ViewModel() {

    private val _bookingsState = MutableStateFlow<UiState<List<BookingHistoryDto>>>(UiState.Loading)
    val bookingsState: StateFlow<UiState<List<BookingHistoryDto>>> = _bookingsState.asStateFlow()

    init {
        loadMyBookings()
    }

    fun loadMyBookings() {
        viewModelScope.launch {
            _bookingsState.value = UiState.Loading
            when (val result = bookingRepository.getMyBookings()) {
                is ApiResult.Success -> {
                    _bookingsState.value = UiState.Success(result.data)
                }
                is ApiResult.Error -> {
                    _bookingsState.value = UiState.Error(result.message)
                }
                is ApiResult.Loading -> {}
            }
        }
    }
}
