'use client';

import React from 'react';
import { usePortalGuard } from '@/lib/portalGuard';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';
import { QrCode, Wifi, WifiOff, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { isAuthorized, hasHydrated } = usePortalGuard(['SCANNER_DEVICE']);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  const handleLogout = () => {
    logout();
    if (typeof window !== 'undefined') localStorage.clear();
    router.replace('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* ── Minimal top bar ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-green-600 flex items-center justify-center">
            <QrCode className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">Ticket Scanner</span>
        </div>

        <div className="flex items-center gap-3">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-green-400 text-xs">
              <Wifi className="h-3.5 w-3.5" />
              <span>Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-red-400 text-xs">
              <WifiOff className="h-3.5 w-3.5" />
              <span>Offline Mode</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <LogOut className="h-3 w-3" />
            <span>{user?.name ?? 'Scanner'}</span>
          </button>
        </div>
      </header>

      {/* ── Full-screen scanner area ─────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
