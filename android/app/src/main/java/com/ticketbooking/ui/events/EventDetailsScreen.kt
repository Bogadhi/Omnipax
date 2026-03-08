@file:OptIn(ExperimentalMaterial3Api::class)
package com.ticketbooking.ui.events

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ticketbooking.ui.base.UiState

@Composable
fun EventDetailsScreen(
    eventId: String,
    onBookClick: (showId: String, eventTitle: String, pricePerSeat: Double) -> Unit,
    viewModel: EventsViewModel = hiltViewModel()
) {
    val eventState by viewModel.eventDetailState.collectAsState()
    val realtimeSeats by viewModel.realtimeSeats.collectAsState()

    LaunchedEffect(eventId) {
        viewModel.loadEventDetails(eventId)
    }
    
    DisposableEffect(Unit) {
        onDispose {
             viewModel.unsubscribeFromSeatUpdates()
        }
    }

    Scaffold(
        topBar = {
             // In real app, add Back Arrow
            CenterAlignedTopAppBar(title = { Text("Event Details") })
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues).fillMaxSize()) {
            when (val state = eventState) {
                is UiState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                is UiState.Error -> {
                    Text(
                        text = state.message,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                is UiState.Success -> {
                    val event = state.data
                    val currentSeats = realtimeSeats ?: event.availableSeats
                    val firstShowId = event.shows?.firstOrNull()?.id

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp)
                    ) {
                        Text(text = event.title ?: "Untitled Event", style = MaterialTheme.typography.headlineSmall)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = event.description ?: "No description provided.", style = MaterialTheme.typography.bodyMedium)
                        
                        Spacer(modifier = Modifier.height(24.dp))
                        
                        Text(text = "Date: ${event.date ?: "TBA"}")
                        Text(text = "Location: ${event.location ?: "TBA"}")
                        Text(text = "Price: $${event.price}")
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Text(
                            text = "Available Seats: $currentSeats",
                            style = MaterialTheme.typography.titleMedium,
                            color = if (currentSeats > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                        )

                        Spacer(modifier = Modifier.weight(1f))

                        Button(
                            onClick = {
                                firstShowId?.let {
                                    onBookClick(
                                        it,
                                        event.title ?: "Event",
                                        event.price.toDouble()
                                    )
                                }
                            },
                            enabled = currentSeats > 0 && firstShowId != null,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(if (currentSeats > 0 && firstShowId != null) "Book Now" else "Sold Out (No Shows Available)")
                        }
                    }
                }
                else -> {}
            }
        }
    }
}
