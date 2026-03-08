package com.ticketbooking.ui.booking

import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ticketbooking.ui.theme.AvailableSeatColor
import com.ticketbooking.ui.theme.BookedSeatColor
import com.ticketbooking.ui.theme.SelectedSeatColor
import com.ticketbooking.ui.theme.TextWhite

// ─── Seat status colors ───────────────────────────────────────────────────────
private val LockedSeatColor = Color(0xFFFFC107)   // Amber — matches web yellow-400

@Composable
fun SeatGrid(
    seats: List<com.ticketbooking.data.api.SeatAvailabilityDto>,
    selectedSeats: Set<String>,
    unavailableSeats: Set<String>,
    onSeatClick: (String) -> Unit
) {
    android.util.Log.d("SEAT_DEBUG", "SeatGrid rendering with ${seats.size} seats")

    if (seats.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No seats found for this show.", style = MaterialTheme.typography.bodyLarge)
        }
        return
    }

    // Group seats by row label (A, B, C …), sort alphabetically
    val rows = seats.groupBy { it.seat?.row ?: "?" }.toSortedMap()
    android.util.Log.d("SEAT_DEBUG", "Grouped into ${rows.size} rows: ${rows.keys}")

    // Shared horizontal scroll state — entire grid scrolls as one unit
    val hScrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(bottom = 120.dp),  // space for bottom bar
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // ── Cinema Screen ─────────────────────────────────────────────────────
        CinemaScreenHeader()

        Spacer(modifier = Modifier.height(24.dp))

        // ── Horizontally scrollable seat grid ─────────────────────────────────
        Box(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(hScrollState)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                rows.forEach { (rowLabel, rowSeats) ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Row letter label (fixed width, not scrolled)
                        Text(
                            text = rowLabel,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.width(28.dp)
                        )

                        Spacer(modifier = Modifier.width(8.dp))

                        // Seats in this row
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            rowSeats.sortedBy { it.seat?.number ?: 0 }.forEach { seat ->
                                // Build seat code like "A5", "H12" — this is what the backend expects
                                val seatCode = "${seat.seat?.row ?: "?"}${seat.seat?.number ?: "?"}"

                                val isSelected = selectedSeats.contains(seatCode)
                                // A seat is unavailable if BOOKED, LOCKED, or in the socket-updated set
                                val isBooked = seat.status != "AVAILABLE" || unavailableSeats.contains(seatCode)

                                SeatItem(
                                    number = seat.seat?.number?.toString() ?: "?",
                                    isBooked = isBooked,
                                    isSelected = isSelected,
                                    onClick = { onSeatClick(seatCode) }  // ← FIXED: send "A5" not UUID
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // ── Horizontal scroll indicator bar ──────────────────────────────────
        HorizontalScrollIndicator(scrollState = hScrollState)

        Spacer(modifier = Modifier.height(20.dp))

        // ── Legend ────────────────────────────────────────────────────────────
        SeatLegend()
    }
}

// ─── Cinema Screen Header ────────────────────────────────────────────────────
@Composable
fun CinemaScreenHeader() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 16.dp, start = 32.dp, end = 32.dp)
    ) {
        // Curved arc line that represents the screen
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(20.dp)
                .drawBehind {
                    val strokeWidth = 6.dp.toPx()
                    val arcHeight = size.height
                    drawArc(
                        brush = Brush.horizontalGradient(
                            colors = listOf(
                                Color(0x00448AFF),
                                Color(0xFF448AFF),
                                Color(0xFF448AFF),
                                Color(0x00448AFF)
                            )
                        ),
                        startAngle = 180f,
                        sweepAngle = 180f,
                        useCenter = false,
                        topLeft = Offset(0f, -arcHeight),
                        size = size.copy(height = arcHeight * 2),
                        style = androidx.compose.ui.graphics.drawscope.Stroke(width = strokeWidth)
                    )
                }
        )

        // Glow underline
        Spacer(
            modifier = Modifier
                .fillMaxWidth(0.8f)
                .height(3.dp)
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color(0xFF448AFF).copy(alpha = 0.6f),
                            Color.Transparent
                        )
                    ),
                    shape = RoundedCornerShape(50)
                )
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "CINEMA SCREEN",
            fontSize = 10.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 4.sp,
            color = Color(0xFF448AFF).copy(alpha = 0.55f)
        )
    }
}

// ─── Horizontal Scroll Indicator ─────────────────────────────────────────────
@Composable
fun HorizontalScrollIndicator(scrollState: ScrollState) {
    if (scrollState.maxValue <= 0) return  // no scroll needed, hide indicator

    val fraction = if (scrollState.maxValue > 0)
        scrollState.value.toFloat() / scrollState.maxValue.toFloat()
    else 0f

    Box(
        modifier = Modifier
            .fillMaxWidth(0.6f)
            .height(4.dp)
            .clip(RoundedCornerShape(50))
            .background(Color(0x22000000))
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(0.35f)  // thumb is 35% of track
                .offset(x = (scrollState.maxValue * fraction * 0.0005f).dp)
                .clip(RoundedCornerShape(50))
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(Color(0xFF448AFF), Color(0xFF82B1FF))
                    )
                )
        )
    }
}

// ─── Legend ──────────────────────────────────────────────────────────────────
@Composable
fun SeatLegend() {
    Row(
        horizontalArrangement = Arrangement.spacedBy(20.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(horizontal = 16.dp)
    ) {
        LegendItem(color = AvailableSeatColor, label = "Available")
        LegendItem(color = SelectedSeatColor, label = "Selected")
        LegendItem(color = LockedSeatColor,   label = "Locked")
        LegendItem(color = BookedSeatColor,   label = "Sold")
    }
}

@Composable
fun LegendItem(color: Color, label: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(14.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(color)
        )
        Text(
            text = label,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            letterSpacing = 0.5.sp
        )
    }
}

// ─── Individual Seat ─────────────────────────────────────────────────────────
@Composable
fun SeatItem(
    number: String,
    isBooked: Boolean,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val bgColor = when {
        isBooked   -> BookedSeatColor
        isSelected -> SelectedSeatColor
        else       -> AvailableSeatColor
    }

    val contentColor = when {
        bgColor == AvailableSeatColor -> Color(0xFF1A1A2E)
        else -> TextWhite
    }

    val borderColor = when {
        isBooked   -> Color.Transparent
        isSelected -> SelectedSeatColor.copy(alpha = 0.5f)
        else       -> Color(0xFFD0D0D0)
    }

    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size(32.dp)
            // Cinema-seat top-curved shape: top is more rounded, bottom less
            .clip(
                RoundedCornerShape(
                    topStart = 8.dp, topEnd = 8.dp,
                    bottomStart = 4.dp, bottomEnd = 4.dp
                )
            )
            .background(bgColor)
            .border(
                width = 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(
                    topStart = 8.dp, topEnd = 8.dp,
                    bottomStart = 4.dp, bottomEnd = 4.dp
                )
            )
            .clickable(enabled = !isBooked) { onClick() }
    ) {
        Text(
            text = number,
            color = contentColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}
