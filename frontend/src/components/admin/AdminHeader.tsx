'use client';

import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';

export default function AdminHeader() {
  const { user } = useAuthStore();

  return (
    <header className="h-20 glass-card border-b border-white/10 sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 text-sm text-foreground/60 w-full max-w-md">
        <Search className="w-4 h-4" />
        <input
          type="text"
          placeholder="Search bookings, users, or events..."
          className="bg-transparent border-none outline-none w-full placeholder:text-foreground/40"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
          <Bell className="w-5 h-5 text-foreground/80" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </button>

        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{user?.email || 'Admin User'}</p>
            <p className="text-xs text-primary font-medium">{user?.role || 'ADMIN'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center font-bold text-white">
            {user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
        </div>
      </div>
    </header>
  );
}
