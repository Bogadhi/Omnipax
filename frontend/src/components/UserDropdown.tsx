'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { LogOut, User, Ticket, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [router]);

  const handleLogout = () => {
    logout(); // Clears Zustand + LocalStorage
    setIsOpen(false);
    router.replace('/');
  };

  if (!user) return null;

  // Get initials
  const initials = user.email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-md">
          {initials}
        </div>
        <span className="hidden max-w-[100px] truncate text-sm font-medium sm:block">
          {user.name || user.email.split('@')[0]}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-white/10 bg-gray-900/95 p-1 shadow-xl backdrop-blur-xl focus:outline-none z-50"
            role="menu"
          >
            <div className="border-b border-white/5 px-3 py-2">
              <p className="text-xs font-medium text-gray-400">Signed in as</p>
              <p className="truncate text-sm font-semibold text-white">{user.email}</p>
            </div>

            <div className="p-1">
              <Link
                href="/profile/bookings"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
                role="menuitem"
              >
                <Ticket className="h-4 w-4" />
                My Bookings
              </Link>
              <Link
                href="/profile"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
                role="menuitem"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
            </div>

            <div className="border-t border-white/5 p-1">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
