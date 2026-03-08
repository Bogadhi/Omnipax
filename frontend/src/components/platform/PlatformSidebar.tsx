'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import {
  BarChart3,
  Users,
  Settings,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  CreditCard,
  BookOpen,
  Activity,
  Globe,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard',     href: '/platform/dashboard',     icon: LayoutDashboard },
  { name: 'Tenants',       href: '/platform/tenants',       icon: Globe },
  { name: 'All Bookings',  href: '/platform/bookings',      icon: BookOpen },
  { name: 'Payments',      href: '/platform/payments',      icon: CreditCard },
  { name: 'Analytics',     href: '/platform/analytics',     icon: BarChart3 },
  { name: 'System Health', href: '/platform/system-health', icon: Activity },
  { name: 'Audit Logs',    href: '/platform/audit-logs',    icon: ShieldCheck },
  { name: 'Feature Flags', href: '/platform/feature-flags', icon: Settings },
  { name: 'Admins',        href: '/platform/admins',        icon: Users },
];

export default function PlatformSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleSignOut = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wide">Super Admin</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Platform Control</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                isActive
                  ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-gray-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all text-sm font-medium"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
