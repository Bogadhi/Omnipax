'use client';

import { useAuthStore } from '@/lib/authStore';
import { useWishlist } from '@/features/wishlist/hooks/useWishlist';
import { EventCard } from '@/features/events/components/EventCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WishlistPage() {
  const { user, hasHydrated } = useAuthStore();
  const { wishlist, isLoading } = useWishlist();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !user) {
      router.push('/login');
    }
  }, [hasHydrated, user, router]);

  if (!hasHydrated || !user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          My Wishlist
        </h1>
        <Link
          href="/events"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Browse Events
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-80 w-full animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="rounded-lg bg-gray-50 py-20 text-center">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Your wishlist is empty
          </h3>
          <p className="mb-4 text-gray-500">
            Explore events and save them here for later.
          </p>
          <Link
            href="/events"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Find Events
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {wishlist.map((item) => (
            <EventCard key={item.eventId} event={item.event} />
          ))}
        </div>
      )}
    </div>
  );
}
