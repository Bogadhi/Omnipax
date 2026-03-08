package com.ticketbooking.model

data class EventsResponse(
    val data: List<Event>
)

data class Event(
    val id: String,
    val title: String,
    val price: Int,
    val totalSeats: Int,
    val availableSeats: Int
)
