'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { eventsApi, Event } from '@/features/events/api/events.api';
import { formatINR } from '@/lib/formatINR';
import { EventType } from '@shared';

// Deterministic urgency badge seeded by event ID so it's stable across renders
type UrgencyBadge = {
  label: string;
  bg: string;
  dot: string;
};
const URGENCY_VARIANTS: UrgencyBadge[] = [
  { label: 'Selling Fast', bg: 'bg-orange-500/15 border-orange-500/30 text-orange-300', dot: 'bg-orange-400' },
  { label: 'Limited Seats', bg: 'bg-red-500/15 border-red-500/30 text-red-300', dot: 'bg-red-400' },
  { label: 'Trending 🔥', bg: 'bg-pink-500/15 border-pink-500/30 text-pink-300', dot: 'bg-pink-400' },
  { label: 'Popular Pick', bg: 'bg-violet-500/15 border-violet-500/30 text-violet-300', dot: 'bg-violet-400' },
];

function getUrgencyBadge(id: string): UrgencyBadge {
  const hash = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return URGENCY_VARIANTS[hash % URGENCY_VARIANTS.length];
}

function MovieCard({ event, index }: { event: Event; index: number }) {
  const badge = getUrgencyBadge(event.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      whileHover={{ y: -6 }}
      className="group relative"
    >
      <Link href={`/events/${event.id}`} className="block">
        <div className="relative rounded-2xl overflow-hidden border border-white/8 bg-gray-900 transition-all duration-300 group-hover:border-violet-500/30 group-hover:shadow-xl group-hover:shadow-violet-900/20">
          {/* Poster */}
          <div className="aspect-[2/3] relative overflow-hidden bg-gray-800">
            {event.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.posterUrl}
                alt={event.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-gray-800 to-gray-900">
                🎬
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent opacity-80" />

            {/* Urgency badge — top left */}
            <div className={`absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border backdrop-blur-sm ${badge.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} animate-pulse`} />
              {badge.label}
            </div>
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-bold text-white text-sm mb-1.5 truncate">{event.title}</h3>

            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {event.language && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700/60">
                  {event.language}
                </span>
              )}
              {event.genre && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300 border border-violet-800/40">
                  {event.genre}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-none">Starting from</p>
                <p className="text-violet-400 font-bold text-sm mt-0.5">{formatINR(event.price)}</p>
              </div>
              <span className="text-xs font-semibold text-violet-200 bg-violet-600/20 border border-violet-500/30 px-3 py-1.5 rounded-full group-hover:bg-violet-600/30 group-hover:border-violet-400/50 transition-all duration-200">
                Book Now
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function FeaturedMovies() {
  const [movies, setMovies] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    eventsApi.getEvents({ type: EventType.MOVIE, limit: 8 })
      .then((res) => setMovies(res.data.slice(0, 8)))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (!isLoading && movies.length === 0) return null;

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <span className="text-violet-400 text-sm font-semibold uppercase tracking-widest">In Cinemas Now</span>
            <h2 className="text-3xl md:text-4xl font-black text-white mt-2">Now Showing</h2>
          </div>
          <Link
            href={`/events?type=${EventType.MOVIE}`}
            className="text-sm text-violet-400 hover:text-violet-300 font-semibold transition-colors hidden sm:block"
          >
            See all movies →
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-gray-900/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {movies.map((movie, i) => (
              <MovieCard key={movie.id} event={movie} index={i} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link href={`/events?type=${EventType.MOVIE}`} className="text-sm text-violet-400 font-semibold">
            See all movies →
          </Link>
        </div>
      </div>
    </section>
  );
}
