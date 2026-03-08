package com.ticketbooking.data

import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException
import java.net.SocketTimeoutException

/**
 * A centralized handler for mapping network and API exceptions to user-friendly messages.
 */
object ApiErrorHandler {
    
    fun handleException(throwable: Throwable): String {
        return when (throwable) {
            is IOException -> "No internet connection. Please check your network."
            is SocketTimeoutException -> "The server is taking too long to respond. Please try again."
            is HttpException -> {
                val response = throwable.response()
                val errorBody = response?.errorBody()?.string()
                
                // Parse standardized backend error structure
                val code = try {
                    if (errorBody != null) {
                        JSONObject(errorBody).optString("errorCode")
                    } else null
                } catch (e: Exception) {
                    null
                }

                if (code != null) {
                    when (code) {
                        "CIRCUIT_OPEN" -> "Payment services are temporarily unavailable. Please try again in 2 minutes."
                        "PLAN_LIMIT_EXCEEDED" -> "Tenant booking limit reached. Please contact support."
                        "FEATURE_DISABLED" -> "This feature is currently disabled for your theater."
                        "PAYMENT_ERROR" -> "Payment verification failed. If money was deducted, a refund will be initiated."
                        "SYSTEM_ERROR" -> "A critical system error occurred. Our team has been notified."
                        "NOT_FOUND" -> "The requested information was not found."
                        "UNAUTHORIZED" -> "Session expired. Please log in again."
                        else -> parseHttpStatus(throwable.code())
                    }
                } else {
                    parseHttpStatus(throwable.code())
                }
            }
            else -> throwable.message ?: "An unknown error occurred. Please try again."
        }
    }

    private fun parseHttpStatus(code: Int): String {
        return when (code) {
            401 -> "Session expired. Please log in again."
            403 -> "You do not have permission for this action."
            404 -> "Resource not found."
            500 -> "Internal server error. Please try again later."
            503 -> "Service is temporarily overloaded. Retrying..."
            else -> "Unexpected error (Code: $code). Please try again."
        }
    }

    fun getHttpCode(throwable: Throwable): Int? {
        return if (throwable is HttpException) throwable.code() else null
    }

    fun getErrorCode(throwable: Throwable): String? {
        return if (throwable is HttpException) {
            try {
                val errorBody = throwable.response()?.errorBody()?.string()
                if (errorBody != null) JSONObject(errorBody).optString("errorCode") else null
            } catch (e: Exception) {
                null
            }
        } else null
    }
}
