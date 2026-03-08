'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMyBookings, BookingDto } from '@/features/bookings/api/bookings.api';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BookingCard } from '@/features/bookings/components/BookingCard';

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMyBookings();
      console.log('[MyBookings] Payload:', data);
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);


  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto pt-32 pb-20 px-6">
          <h1 className="text-4xl font-black mb-12">My Bookings</h1>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-24 text-center">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gray-50 text-4xl shadow-inner">
                🎟
              </div>
              <h3 className="text-2xl font-black text-gray-900">Your collection is empty</h3>
              <p className="mt-2 text-gray-500 max-w-sm mx-auto font-medium">
                You haven't booked any experiences yet. Start exploring our premium events marketplace.
              </p>
              <Link
                href="/events"
                className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-gray-900 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-blue-600 hover:shadow-2xl hover:shadow-blue-500/30"
              >
                Find Your Next Experience
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </div>
          ) : (
              <div className="grid gap-6">
                {bookings.map((booking) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <BookingCard
                      booking={booking}
                      onCancelled={() => fetchBookings()}
                    />
                  </motion.div>
                ))}
              </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
