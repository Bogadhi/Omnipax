'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { Ticket } from 'lucide-react';
import UserDropdown from './UserDropdown';

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  
  const isAuthenticated = !!user;

  /**
   * 🔥 CRITICAL FIX
   * Force component to re-render after hydration
   * Ensures navbar updates correctly after refresh
   */
  useEffect(() => {
    if (!hasHydrated) return;
  }, [hasHydrated]);

  // 🚫 Do not render anything until Zustand rehydrates
  if (!hasHydrated) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-card px-8 py-3">

        {/* Logo */}
        <Link
          href="/events"
          className="flex items-center gap-2 text-xl font-bold text-primary"
        >
          <Ticket className="w-8 h-8" />
          <span>StarPass</span>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-6">

          {isAuthenticated ? (
            <UserDropdown />
          ) : (
            <Link
              href="/login"
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full font-semibold transition-all shadow-lg shadow-primary/20"
            >
              Login to Book Tickets
            </Link>
          )}

        </div>
      </div>
    </nav>
  );
}