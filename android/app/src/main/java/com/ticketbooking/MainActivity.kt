package com.ticketbooking

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material3.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.*
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener
import com.ticketbooking.ui.auth.LoginScreen
import com.ticketbooking.ui.booking.BookingScreen
import com.ticketbooking.ui.booking.BookingSuccessScreen
import com.ticketbooking.ui.booking.CheckoutScreen
import com.ticketbooking.ui.booking.MyBookingsScreen
import com.ticketbooking.ui.events.EventDetailsScreen
import com.ticketbooking.ui.events.EventListScreen
import com.ticketbooking.ui.landing.LandingScreen
import com.ticketbooking.utils.PaymentManager
import com.ticketbooking.utils.TokenManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity(), PaymentResultWithDataListener {

    @Inject
    lateinit var tokenManager: TokenManager

    @Inject
    lateinit var paymentManager: PaymentManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            com.ticketbooking.ui.theme.TicketBookingTheme {

                val navController = rememberNavController()
                val startDestination = "landing"

                LaunchedEffect(Unit) {
                    tokenManager.logoutEvents.collect {
                        navController.navigate("login") {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                }

                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                Scaffold(
                    bottomBar = {
                        if (currentRoute in listOf("events", "my_bookings")) {
                            NavigationBar {

                                NavigationBarItem(
                                    icon = {
                                        Icon(
                                            Icons.Default.DateRange,
                                            contentDescription = "Events"
                                        )
                                    },
                                    label = { Text("Events") },
                                    selected = currentRoute == "events",
                                    onClick = {
                                        navController.navigate("events") {
                                            popUpTo(navController.graph.startDestinationId) {
                                                saveState = true
                                            }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                )

                                NavigationBarItem(
                                    icon = {
                                        Icon(
                                            Icons.AutoMirrored.Filled.List,
                                            contentDescription = "My Bookings"
                                        )
                                    },
                                    label = { Text("My Bookings") },
                                    selected = currentRoute == "my_bookings",
                                    onClick = {
                                        navController.navigate("my_bookings") {
                                            popUpTo(navController.graph.startDestinationId) {
                                                saveState = true
                                            }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                )
                            }
                        }
                    }
                ) { innerPadding ->

                    NavHost(
                        navController = navController,
                        startDestination = startDestination,
                        modifier = Modifier.padding(innerPadding)
                    ) {

                        composable("landing") {
                            LandingScreen(
                                onExploreClick = {
                                    navController.navigate("events")
                                },
                                onLoginClick = {
                                    if (tokenManager.hasToken()) {
                                        navController.navigate("events")
                                    } else {
                                        navController.navigate("login")
                                    }
                                }
                            )
                        }

                        composable("login") {
                            LoginScreen(
                                onLoginSuccess = {
                                    navController.navigate("events") {
                                        popUpTo("login") { inclusive = true }
                                    }
                                }
                            )
                        }

                        composable("events") {
                            EventListScreen(
                                onEventClick = { eventId ->
                                    navController.navigate("eventDetails/$eventId")
                                }
                            )
                        }

                        composable("eventDetails/{eventId}") { backStackEntry ->
                            val eventId =
                                backStackEntry.arguments?.getString("eventId")
                                    ?: return@composable

                            EventDetailsScreen(
                                eventId = eventId,
                                onBookClick = { showId, eventTitle, pricePerSeat ->
                                    navController.navigate("booking/$eventId/$showId/${java.net.URLEncoder.encode(eventTitle, "UTF-8")}/$pricePerSeat")
                                }
                            )
                        }

                        composable("booking/{eventId}/{showId}/{eventTitle}/{pricePerSeat}") { backStackEntry ->
                            val eventId =
                                backStackEntry.arguments?.getString("eventId")
                                    ?: return@composable
                            val showId =
                                backStackEntry.arguments?.getString("showId")
                                    ?: return@composable
                            val eventTitle = java.net.URLDecoder.decode(
                                backStackEntry.arguments?.getString("eventTitle") ?: "", "UTF-8"
                            )
                            val pricePerSeat =
                                backStackEntry.arguments?.getString("pricePerSeat")?.toDoubleOrNull() ?: 0.0

                            BookingScreen(
                                eventId = eventId,
                                showId = showId,
                                pricePerSeat = pricePerSeat,
                                onBookingSuccess = { finalBookingId ->
                                    if (finalBookingId.isNotBlank()) {
                                        navController.navigate("bookingSuccess/$finalBookingId") {
                                            popUpTo("events") { inclusive = false }
                                            launchSingleTop = true
                                        }
                                    }
                                },
                                onReviewOrder = { seats, price ->
                                    val encodedSeats = java.net.URLEncoder.encode(seats, "UTF-8")
                                    val encodedTitle = java.net.URLEncoder.encode(eventTitle, "UTF-8")
                                    navController.navigate("checkout/$showId/$encodedSeats/$price/$encodedTitle")
                                }
                            )
                        }

                        // Fallback route without event metadata (old deep-links)
                        composable("booking/{eventId}/{showId}") { backStackEntry ->
                            val eventId =
                                backStackEntry.arguments?.getString("eventId")
                                    ?: return@composable
                            val showId =
                                backStackEntry.arguments?.getString("showId")
                                    ?: return@composable

                            BookingScreen(
                                eventId = eventId,
                                showId = showId,
                                onBookingSuccess = { finalBookingId ->
                                    if (finalBookingId.isNotBlank()) {
                                        navController.navigate("bookingSuccess/$finalBookingId") {
                                            popUpTo("events") { inclusive = false }
                                            launchSingleTop = true
                                        }
                                    }
                                },
                                onReviewOrder = { seats, price ->
                                    val encodedSeats = java.net.URLEncoder.encode(seats, "UTF-8")
                                    navController.navigate("checkout/$showId/$encodedSeats/$price/Event")
                                }
                            )
                        }

                        // ── Checkout / Order Summary screen ─────────────────
                        composable("checkout/{showId}/{seats}/{price}/{eventTitle}") { backStackEntry ->
                            val showId =
                                backStackEntry.arguments?.getString("showId")
                                    ?: return@composable
                            val seats = java.net.URLDecoder.decode(
                                backStackEntry.arguments?.getString("seats") ?: "", "UTF-8"
                            )
                            val price =
                                backStackEntry.arguments?.getString("price")?.toDoubleOrNull() ?: 0.0
                            val title = java.net.URLDecoder.decode(
                                backStackEntry.arguments?.getString("eventTitle") ?: "Event", "UTF-8"
                            )

                            CheckoutScreen(
                                showId = showId,
                                selectedSeats = seats,
                                pricePerSeat = price,
                                eventTitle = title,
                                onBack = { navController.popBackStack() },
                                onLaunchPayment = { bookingResponse ->
                                    launchRazorpayPayment(bookingResponse)
                                }
                            )
                        }

                        composable("bookingSuccess/{bookingId}") { backStackEntry ->
                            val bookingId =
                                backStackEntry.arguments?.getString("bookingId")
                                    ?: return@composable

                            BookingSuccessScreen(
                                bookingId = bookingId,
                                onNavigateHome = {
                                    navController.navigate("events") {
                                        popUpTo("events") { inclusive = false }
                                        launchSingleTop = true
                                    }
                                }
                            )
                        }

                        composable("my_bookings") {
                            MyBookingsScreen(
                                onBookingClick = { bookingId ->
                                    navController.navigate("bookingSuccess/$bookingId")
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    private fun launchRazorpayPayment(
        booking: com.ticketbooking.data.api.BookingResponse
    ) {
        if (isFinishing || isDestroyed) return

        val checkout = com.razorpay.Checkout()
        checkout.setKeyID("rzp_test_SHS9HD6avib27k")

        try {
            val options = org.json.JSONObject()
            options.put("name", "Ticket Booking App")
            options.put("description", "Event Booking")
            options.put("currency", "INR")
            options.put("amount", booking.amount * 100)
            options.put("order_id", booking.orderId)
            options.put("prefill.email", "test@example.com")
            options.put("prefill.contact", "9999999999")

            checkout.open(this, options)

        } catch (e: Exception) {
            CoroutineScope(Dispatchers.Main).launch {
                paymentManager.onPaymentError("Launch failed: ${e.message}")
            }
        }
    }

    override fun onPaymentSuccess(
        razorpayPaymentId: String?,
        paymentData: PaymentData?
    ) {
        val paymentId = razorpayPaymentId ?: paymentData?.paymentId ?: ""
        val signature = paymentData?.signature ?: ""

        CoroutineScope(Dispatchers.Main).launch {
            paymentManager.onPaymentSuccess(paymentId, signature)
        }
    }

    override fun onPaymentError(
        errorCode: Int,
        response: String?,
        paymentData: PaymentData?
    ) {
        CoroutineScope(Dispatchers.Main).launch {
            paymentManager.onPaymentError("Payment failed: $response")
        }
    }
}