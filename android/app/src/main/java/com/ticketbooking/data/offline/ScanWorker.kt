package com.ticketbooking.data.offline

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.hilt.work.HiltWorker
import com.ticketbooking.data.api.TicketsApi
import com.ticketbooking.data.api.ScanTicketDto
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.lang.Exception

@HiltWorker
class ScanWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val ticketsApi: TicketsApi,
    private val scanDao: ScanDao
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val pendingScans = scanDao.getPendingScansList()
        if (pendingScans.isEmpty()) return Result.success()

        var allSuccessful = true

        for (scan in pendingScans) {
            try {
                val response = ticketsApi.scanTicket(
                    ScanTicketDto(
                        qrToken = scan.qrToken,
                        deviceId = scan.deviceId
                    )
                )

                if (response.isSuccessful) {
                    scanDao.markAsSynced(scan.id)
                } else {
                    allSuccessful = false
                    scanDao.incrementRetryCount(scan.id)
                }
            } catch (e: Exception) {
                allSuccessful = false
                scanDao.incrementRetryCount(scan.id)
            }
        }

        return if (allSuccessful) {
            Result.success()
        } else {
            if (runAttemptCount > 10) {
                Result.failure()
            } else {
                Result.retry()
            }
        }
    }
}
