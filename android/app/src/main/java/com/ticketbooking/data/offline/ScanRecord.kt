package com.ticketbooking.data.offline

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "scan_records")
data class ScanRecord(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val qrToken: String,
    val scannedAt: Long = System.currentTimeMillis(),
    val status: String = "PENDING", // PENDING, SYNCED
    val deviceId: String? = null,
    val retryCount: Int = 0
)
