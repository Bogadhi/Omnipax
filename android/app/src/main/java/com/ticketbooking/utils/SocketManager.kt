package com.ticketbooking.utils

import io.socket.client.IO
import io.socket.client.Socket
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SocketManager @Inject constructor(
    private val tokenManager: TokenManager
) {
    private var socket: Socket? = null
    private val SOCKET_URL = "https://api.yourdomain.com" // Replace with actual URL

    fun connect() {
        if (socket?.connected() == true) return

        val token = tokenManager.getToken() ?: return

        try {
            val options = IO.Options().apply {
                auth = mapOf("token" to "Bearer $token")
                reconnection = true
                forceNew = true
            }
            socket = IO.socket(SOCKET_URL, options)
            socket?.connect()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket = null
    }

    fun getSocket(): Socket? {
        return socket
    }

    fun isConnected(): Boolean {
        return socket?.connected() == true
    }
}
