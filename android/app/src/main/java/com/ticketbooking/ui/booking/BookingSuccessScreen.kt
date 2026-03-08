package com.ticketbooking.ui.booking

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import androidx.hilt.navigation.compose.hiltViewModel
import com.ticketbooking.ui.base.UiState
import com.ticketbooking.ui.theme.PrimaryPink
import com.ticketbooking.ui.theme.TextWhite
import org.json.JSONObject

@Composable
fun BookingSuccessScreen(
    bookingId: String,
    onNavigateHome: () -> Unit,
    viewModel: BookingViewModel = hiltViewModel()
) {
    val bookingDetails by viewModel.bookingDetails.collectAsState()
    var qrBitmap by remember { mutableStateOf<Bitmap?>(null) }

    LaunchedEffect(bookingId) {
        viewModel.fetchBookingDetails(bookingId)
    }

    LaunchedEffect(bookingDetails) {
        if (bookingDetails is UiState.Success) {
            val booking = (bookingDetails as UiState.Success).data
            val seatsList = booking.bookingSeats.map { "${it.seat.row}${it.seat.number}" }
            
            val payload = JSONObject().apply {
                put("bookingId", booking.id)
                put("eventTitle", booking.show.event.title)
                put("showTime", booking.show.startTime)
                put("seats", org.json.JSONArray(seatsList))
                put("timestamp", booking.createdAt)
            }
            qrBitmap = generateQrCode(payload.toString())
        }
    }

    Scaffold(
        topBar = {
            @OptIn(ExperimentalMaterial3Api::class)
            CenterAlignedTopAppBar(
                title = { Text("Ticket Confirmed", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = Color.Transparent
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .padding(paddingValues)
                .fillMaxSize()
        ) {
            when (val state = bookingDetails) {
                is UiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is UiState.Error -> Text("Failed to load details: ${state.message}", modifier = Modifier.align(Alignment.Center), color = MaterialTheme.colorScheme.error)
                is UiState.Success -> {
                    val booking = state.data
                    val seatsList = booking.bookingSeats.map { "${it.seat.row}${it.seat.number}" }
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = booking.show.event.title,
                                    style = MaterialTheme.typography.headlineMedium,
                                    color = PrimaryPink,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Time: ${booking.show.startTime}",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = TextWhite
                                )
                                Spacer(modifier = Modifier.height(16.dp))

                                Text(
                                    text = "Seats: ${seatsList.joinToString(", ")}",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )

                                Spacer(modifier = Modifier.height(24.dp))

                                qrBitmap?.let { bitmap ->
                                    Box(
                                        modifier = Modifier
                                            .size(220.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color.White)
                                            .padding(8.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Image(
                                            bitmap = bitmap.asImageBitmap(),
                                            contentDescription = "Ticket QR Code",
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    }
                                } ?: CircularProgressIndicator(modifier = Modifier.size(50.dp))

                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = "ID: ${booking.id.take(8).uppercase()}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(48.dp))

                        Button(
                            onClick = onNavigateHome,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryPink),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Back to Events", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                else -> {}
            }
        }
    }
}

fun generateQrCode(content: String): Bitmap? {
    try {
        val writer = QRCodeWriter()
        val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, 512, 512)
        val width = bitMatrix.width
        val height = bitMatrix.height
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
        for (x in 0 until width) {
            for (y in 0 until height) {
                bitmap.setPixel(x, y, if (bitMatrix.get(x, y)) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
            }
        }
        return bitmap
    } catch (e: Exception) {
        e.printStackTrace()
        return null
    }
}
