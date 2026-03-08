package com.ticketbooking.data.offline

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ScanDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScan(scan: ScanRecord)

    @Query("SELECT * FROM scan_records WHERE status = 'PENDING' ORDER BY scannedAt ASC")
    fun getPendingScans(): Flow<List<ScanRecord>>

    @Query("SELECT * FROM scan_records WHERE status = 'PENDING' ORDER BY scannedAt ASC")
    suspend fun getPendingScansList(): List<ScanRecord>

    @Update
    suspend fun updateScan(scan: ScanRecord)

    @Delete
    suspend fun deleteScan(scan: ScanRecord)

    @Query("UPDATE scan_records SET status = 'SYNCED' WHERE id = :id")
    suspend fun markAsSynced(id: Long)

    @Query("UPDATE scan_records SET retryCount = retryCount + 1 WHERE id = :id")
    suspend fun incrementRetryCount(id: Long)
}
