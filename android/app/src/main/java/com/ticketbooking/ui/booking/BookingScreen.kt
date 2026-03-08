package com.ticketbooking.ui.booking

import android.app.Activity
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ticketbooking.ui.base.UiState
import com.ticketbooking.data.api.SeatAvailabilityDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingScreen(
    eventId: String,
    showId: String,
    pricePerSeat: Double = 0.0,
    onBookingSuccess: (String) -> Unit,
    onReviewOrder: (selectedSeats: String, pricePerSeat: Double) -> Unit,
    viewModel: BookingViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(eventId, showId) {
        viewModel.loadSeats(eventId, showId)
        viewModel.subscribeToSeatUpdates(showId)
    }

    DisposableEffect(Unit) {
        onDispose { viewModel.unsubscribeFromSeatUpdates() }
    }

    // paymentVerificationState is handled in CheckoutScreen's BookingViewModel
    LaunchedEffect(uiState.paymentVerificationState) {
        when (val state = uiState.paymentVerificationState) {
            is UiState.Success<*> -> {
                val bookingId = state.data as? String
                if (!bookingId.isNullOrBlank()) onBookingSuccess(bookingId)
            }
            else -> {}
        }
    }

    val isProcessing =
        uiState.bookingState is UiState.Loading ||
        uiState.paymentVerificationState is UiState.Loading

    // unavailableSeatLabels removal as we use UUIDs from uiState.unavailableSeats directly.

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Select Seats") }
            )
        },
        bottomBar = {
            BottomAppBar {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "${uiState.selectedSeats.size} seats selected",
                        style = MaterialTheme.typography.titleMedium
                    )

                    Button(
                        onClick = {
                            // Navigate to checkout review before payment
                            val seats = uiState.selectedSeats.joinToString(",")
                            onReviewOrder(seats, pricePerSeat)
                        },
                        enabled = uiState.selectedSeats.isNotEmpty() && !isProcessing
                    ) {
                        Text("Review Order →")
                    }
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .padding(paddingValues)
                .fillMaxSize()
        ) {
            when {
                uiState.isLoadingSeats -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                uiState.seatingError != null -> {
                    Text(
                        text = uiState.seatingError ?: "Unknown error",
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                else -> {
                    SeatGrid(
                        seats = uiState.seats,
                        selectedSeats = uiState.selectedSeats,
                        unavailableSeats = uiState.unavailableSeats,
                        onSeatClick = viewModel::selectSeat
                    )
                }
            }
        }
    }
}