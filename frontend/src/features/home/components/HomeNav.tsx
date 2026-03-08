'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { motion } from 'framer-motion';
import UserDropdown from '@/components/UserDropdown';

export default function HomeNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 40);
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);

  // 🚫 Do not render anything until Zustand rehydrates to prevent hydration mismatch
  if (!hasHydrated) return null;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled || menuOpen
          ? 'rgba(7, 4, 18, 0.95)'
          : 'transparent',
        backdropFilter: scrolled || menuOpen ? 'blur(20px)' : 'none',
        borderBottom: (scrolled || menuOpen) ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        height: menuOpen ? '100vh' : 'auto',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMenuOpen(false)}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-black text-white shadow-lg shadow-violet-900/40 transition-transform group-hover:scale-105">
              S
            </div>
            <span className="font-black text-white text-xl tracking-tight">StarPass</span>
          </Link>

          {/* Desktop Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-wider text-gray-400">
            <Link href="/events?type=MOVIE" className="hover:text-white transition-colors">Movies</Link>
            <Link href="/events?type=CONCERT" className="hover:text-white transition-colors">Concerts</Link>
            <Link href="/events" className="hover:text-white transition-colors">All Events</Link>
          </div>

          {/* Actions & Mobile Toggle */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <>
                  <Link
                    href="/events"
                    className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 transition-all shadow-xl shadow-violet-900/40"
                  >
                    Book Now
                  </Link>
                  <UserDropdown />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all px-4"
                  >
                    Login
                  </Link>
                  <Link
                    href="/login"
                    className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 transition-all shadow-xl shadow-violet-900/30"
                  >
                    Join StarPass
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              <div className="w-6 h-5 relative flex flex-col justify-between items-end">
                <span className={`h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'w-6 rotate-45 translate-y-2' : 'w-6'}`} />
                <span className={`h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : 'w-4'}`} />
                <span className={`h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'w-6 -rotate-45 -translate-y-2.5' : 'w-5'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu Content */}
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden py-12 flex flex-col gap-8 text-center"
          >
            <div className="flex flex-col gap-6">
              <Link href="/events?type=MOVIE" onClick={() => setMenuOpen(false)} className="text-3xl font-black text-white hover:text-violet-400 transition-colors">Movies</Link>
              <Link href="/events?type=CONCERT" onClick={() => setMenuOpen(false)} className="text-3xl font-black text-white hover:text-violet-400 transition-colors">Concerts</Link>
              <Link href="/events" onClick={() => setMenuOpen(false)} className="text-3xl font-black text-white hover:text-violet-400 transition-colors">All Events</Link>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-col items-center gap-6">
              {user ? (
                <>
                  <UserDropdown />
                  <Link
                    href="/events"
                    onClick={() => setMenuOpen(false)}
                    className="w-full max-w-xs py-5 rounded-2xl text-sm font-black uppercase tracking-widest bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                  >
                    Book Tickets Now
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="w-full max-w-xs py-5 rounded-2xl text-sm font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="w-full max-w-xs py-5 rounded-2xl text-sm font-black uppercase tracking-widest bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-xl shadow-violet-600/20"
                  >
                    Join StarPass
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
