package com.ticketbooking.utils

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

sealed class PaymentResult {
    data class Success(val paymentId: String, val signature: String) : PaymentResult()
    data class Error(val message: String) : PaymentResult()
}

@Singleton
class PaymentManager @Inject constructor() {

    private val _paymentResults =
        MutableSharedFlow<PaymentResult>(
            replay = 0,
            extraBufferCapacity = 1
        )

    val paymentResults = _paymentResults.asSharedFlow()

    suspend fun onPaymentSuccess(paymentId: String, signature: String) {
        _paymentResults.emit(PaymentResult.Success(paymentId, signature))
    }

    suspend fun onPaymentError(message: String) {
        _paymentResults.emit(PaymentResult.Error(message))
    }
}