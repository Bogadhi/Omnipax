package com.ticketbooking.utils

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext context: Context
) {
    private val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
    
    private val _logoutEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val logoutEvents = _logoutEvents.asSharedFlow()

    fun triggerLogout() {
        clearToken()
        _logoutEvents.tryEmit(Unit)
    }
    
    private val sharedPreferences = EncryptedSharedPreferences.create(
        "secure_token_prefs",
        masterKeyAlias,
        context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveToken(token: String) {
        sharedPreferences.edit().putString("auth_token", token).apply()
    }

    fun getToken(): String? {
        return sharedPreferences.getString("auth_token", null)
    }

    /**
     * Development-only default: "starpass"
     * In production, this should be set via user selection or onboarding.
     */
    fun saveTenantSlug(slug: String) {
        sharedPreferences.edit().putString("tenant_slug", slug).apply()
    }

    fun getTenantSlug(): String {
        return sharedPreferences.getString("tenant_slug", "starpass") ?: "starpass"
    }

    fun clearToken() {
        sharedPreferences.edit()
            .remove("auth_token")
            .apply()
    }

    fun hasToken(): Boolean {
        return !getToken().isNullOrEmpty()
    }
}
