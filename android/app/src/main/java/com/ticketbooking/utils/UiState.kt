package com.ticketbooking.utils

/**
 * A sealed class representing the various states of the UI.
 * Used across the app to provide a consistent pattern for Loaders, Errors, and Data.
 */
sealed class UiState<out T> {
    object Idle : UiState<Nothing>()
    object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String, val code: Int? = null) : UiState<Nothing>()

    val isLoading get() = this is Loading
    val isError get() = this is Error
    val isSuccess get() = this is Success
}
