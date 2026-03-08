'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  MonitorPlay,
  Tag,
  Ticket,
  Users,
  BarChart3,
  LogOut,
  ChevronRight,
  Building,
} from 'lucide-react';
import { usePortalGuard } from '@/lib/portalGuard';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/admin',           icon: LayoutDashboard },
  { label: 'Theaters',  href: '/admin/theaters',  icon: Building },
  { label: 'Events',    href: '/admin/events',    icon: Film },
  { label: 'Shows',     href: '/admin/shows',     icon: MonitorPlay },
  { label: 'Pricing',   href: '/admin/pricing',   icon: Tag },
  { label: 'Bookings',  href: '/admin/bookings',  icon: Ticket },
  { label: 'Staff',     href: '/admin/staff',     icon: Users },
  { label: 'Reports',   href: '/admin/reports',   icon: BarChart3 },
];

export default function TenantAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { isAuthorized, hasHydrated } = usePortalGuard(['ADMIN']);

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
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
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Building className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest">Tenant</p>
              <h1 className="text-sm font-bold text-white">{user?.tenantName ?? 'Admin Panel'}</h1>
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
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-blue-400' : ''}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="h-3 w-3 text-blue-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-xs font-bold">
              {user?.name?.[0] ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name ?? 'Admin'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email ?? ''}</p>
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