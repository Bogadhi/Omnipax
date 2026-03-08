'use client';

import { useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { eventsApi } from '@/features/events/api/events.api';
import { EventCard } from '@/features/events/components/EventCard';
import { useAuthStore } from '@/lib/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { EventType } from '@shared';
import Link from 'next/link';

export default function EventsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Sync state from URL
  const querySearch = searchParams.get('search') || '';
  const queryType = searchParams.get('type') as EventType | undefined;

  const [search, setSearch] = useState(querySearch);
  const debouncedSearch = useDebounce(search, 300);

  const { user, hasHydrated } = useAuthStore();
  const isAuthenticated = !!user;

  // React to URL changes (e.g. clicking category link from home)
  useEffect(() => {
    setSearch(querySearch);
  }, [querySearch]);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['events', debouncedSearch, queryType, searchParams.toString()], // Sync fetch with URL
    queryFn: ({ pageParam }) =>
      eventsApi.getEvents({
        cursor: pageParam as string | undefined,
        limit: 9,
        search: debouncedSearch,
        type: queryType,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => (lastPage as any).meta?.nextCursor ?? undefined,
  });

  const handleFilterChange = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  if (!hasHydrated) return null;

  // Distinct Empty States Logic
  const totalEventsInFirstPage = data?.pages[0]?.data?.length ?? 0;
  const isSearchActive = !!debouncedSearch;
  const isFilterActive = !!queryType;

  if (isError) {
    return (
      <div className="container mx-auto py-20 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Unable to load events</h2>
        <p className="mt-2 text-gray-500 max-w-xs mx-auto">
          {(error as Error).message || 'There was a problem connecting to our servers.'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {queryType ? `${queryType.charAt(0) + queryType.slice(1).toLowerCase()}s` : 'Explore Events'}
          </h1>
          <p className="mt-1 text-gray-500">Discover and book the best experiences near you</p>
        </div>

        {!isAuthenticated && (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            <span>Login to Book Tickets</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </Link>
        )}
      </div>

      {/* Filters & Search */}
      <div className="mb-10 flex flex-col gap-4 rounded-2xl bg-white border border-gray-100 p-6 shadow-sm md:flex-row md:items-end">
        <div className="flex-1">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
            Search
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by title, description, or venue..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        <div className="w-full md:w-48">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
            Category
          </label>
          <select
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"
            value={queryType || ''}
            onChange={(e) => handleFilterChange({ type: e.target.value || undefined })}
          >
            <option value="">All Categories</option>
            <option value="MOVIE">Movies</option>
            <option value="CONCERT">Concerts</option>
            <option value="EVENT">Live Events</option>
          </select>
        </div>

        <button
          onClick={() => {
            setSearch('');
            router.push(pathname);
          }}
          className="h-[46px] rounded-xl border border-gray-200 px-6 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
        >
          Reset Filters
        </button>
      </div>

      {/* Grid States */}
      {isLoading ? (
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-gray-100 sm:aspect-[3/4]"
            />
          ))}
        </div>
      ) : totalEventsInFirstPage === 0 ? (
        <div className="py-24 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 text-3xl">
            {isSearchActive ? '🔍' : isFilterActive ? '🎭' : '📅'}
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            {isSearchActive ? 'No match found for your search' : isFilterActive ? `No ${queryType?.toLowerCase()}s scheduled` : 'No events available'}
          </h3>
          <p className="mt-2 text-gray-500">
            {isSearchActive ? 'Try using different keywords or clearing filters.' : 'Check back later for new dates and shows.'}
          </p>
          {(isSearchActive || isFilterActive) && (
            <button
              onClick={() => {
                setSearch('');
                router.push(pathname);
              }}
              className="mt-6 rounded-lg border border-gray-300 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-x-4 gap-y-10 grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {data?.pages.map((page: any) =>
              page.data.map((event: any) => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </div>

          {hasNextPage && (
            <div className="mt-16 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xl bg-gray-900 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-blue-600 hover:ring-4 hover:ring-blue-100"
              >
                <span className="relative z-10">{isFetchingNextPage ? 'Loading...' : 'Load More Experiences'}</span>
                {!isFetchingNextPage && <svg className="w-4 h-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}