package com.ticketbooking.data.repository

import com.ticketbooking.utils.ApiResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Response

abstract class BaseRepository {
    protected suspend fun <T> safeApiCall(apiCall: suspend () -> Response<T>): ApiResult<T> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiCall()
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null) {
                        ApiResult.Success(body)
                    } else {
                        ApiResult.Error("Response body is null")
                    }
                } else {
                    ApiResult.Error("Error: ${response.code()} ${response.message()}", response.code())
                }
            } catch (e: Exception) {
                ApiResult.Error(e.message ?: "Unknown error occurred")
            }
        }
    }
}
