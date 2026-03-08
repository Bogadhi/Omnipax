'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Map,
  QrCode,
  BarChart2,
  LogOut,
  ChevronRight,
  Clapperboard,
} from 'lucide-react';
import { usePortalGuard } from '@/lib/portalGuard';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: "Today's Shows", href: '/theatre',          icon: Calendar },
  { label: 'Seat Map',      href: '/theatre/seat-map', icon: Map },
  { label: 'Scan Tickets',  href: '/theatre/scan',     icon: QrCode },
  { label: 'Local Reports', href: '/theatre/reports',  icon: BarChart2 },
];

export default function TheatreLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { isAuthorized, hasHydrated } = usePortalGuard(['THEATER_MANAGER']);

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
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
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Clapperboard className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Theatre</p>
              <h1 className="text-sm font-bold text-white">Manager Portal</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-amber-400' : ''}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="h-3 w-3 text-amber-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold">
              {user?.name?.[0] ?? 'M'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name ?? 'Manager'}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto bg-black">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
