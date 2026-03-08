'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  DollarSign,
  Activity,
  FileText,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { usePortalGuard } from '@/lib/portalGuard';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard',       href: '/super-admin',              icon: LayoutDashboard },
  { label: 'Tenants',         href: '/super-admin/tenants',      icon: Building2 },
  { label: 'Platform Admins', href: '/super-admin/admins',       icon: Users },
  { label: 'Revenue',         href: '/super-admin/revenue',      icon: DollarSign },
  { label: 'System Health',   href: '/super-admin/system-health',icon: Activity },
  { label: 'Audit Logs',      href: '/super-admin/audit-logs',   icon: FileText },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { isAuthorized, hasHydrated } = usePortalGuard(['SUPER_ADMIN']);

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
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
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Platform</p>
              <h1 className="text-sm font-bold text-white">Super Admin</h1>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-violet-400' : ''}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="h-3 w-3 text-violet-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold">
              {user?.name?.[0] ?? 'S'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name ?? 'Super Admin'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email ?? ''}</p>
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
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
