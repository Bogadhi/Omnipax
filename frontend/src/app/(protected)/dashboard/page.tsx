'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getMyBookings } from '@/features/bookings/api/bookings.api';
import { BookingCard } from '@/features/bookings/components/BookingCard';
import { Loader2, Ticket } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = !!user;
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const { data: bookings, isLoading: isBookingsLoading, error } = useQuery({
    queryKey: ['myBookings'],
    queryFn: getMyBookings,
    enabled: isAuthenticated, // Only fetch if authenticated
  });

  if (isBookingsLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
          <p className="text-gray-400">View your tickets and access QR codes for entry.</p>
        </header>

        {error ? (
           <div className="text-red-400 bg-red-900/10 p-4 rounded-lg border border-red-900/50">
             Failed to load bookings. Please try again later.
           </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-gray-900/30 rounded-2xl border border-gray-800 border-dashed">
            <Ticket className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-medium text-gray-300 mb-2">No bookings yet</h3>
            <p className="mb-6">Ready to see a show? Explore what's playing now.</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-full font-medium transition-colors"
            >
              Browse Events
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
