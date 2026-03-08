'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Calendar, Zap } from 'lucide-react';
import { eventsApi, Event } from '@/features/events/api/events.api';
import { formatINR } from '@/lib/formatINR';
import { EventType } from '@shared';

/** Returns today's ISO date string (YYYY-MM-DD) */
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/** Returns the upcoming Sunday's ISO date string */
function weekendEndISO() {
  const d = new Date();
  // days until Sunday: 0=Sun → +0 if today is Sun, else 7 - d.getDay()
  const daysUntilSunday = d.getDay() === 0 ? 0 : 7 - d.getDay();
  d.setDate(d.getDate() + daysUntilSunday);
  return d.toISOString().split('T')[0];
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function WeekendCard({ event, index }: { event: Event; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link href={`/events/${event.id}`} className="block">
        <div className="relative rounded-2xl overflow-hidden border border-white/8 bg-gray-900 hover:border-orange-500/30 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-orange-900/10">
          {/* Banner */}
          <div className="h-40 relative overflow-hidden bg-gray-800">
            {event.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.posterUrl}
                alt={event.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-orange-900/20 to-gray-900">
                {event.type === EventType.MOVIE ? '🎬' : '🎤'}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/30 to-transparent" />

            {/* Weekend badge */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border bg-orange-500/20 border-orange-500/40 text-orange-300 backdrop-blur-sm">
              <Zap className="w-2.5 h-2.5" />
              This Weekend
            </div>

            {/* Type tag */}
            <div className="absolute top-2.5 right-2.5 text-[10px] px-2 py-1 rounded-full bg-black/60 border border-white/15 text-gray-300 backdrop-blur-sm font-medium">
              {event.type === EventType.MOVIE ? 'Movie' : event.type === EventType.CONCERT ? 'Concert' : 'Event'}
            </div>
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-bold text-white text-sm mb-2 line-clamp-1">{event.title}</h3>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
              <Calendar className="w-3 h-3 text-orange-400/70 flex-shrink-0" />
              <span>{formatShortDate(event.date)}</span>
              {event.location && (
                <>
                  <span className="text-gray-700">•</span>
                  <span className="truncate">{event.location}</span>
                </>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">From</p>
                <p className="text-orange-400 font-bold text-sm">{formatINR(event.price)}</p>
              </div>
              <span className="text-xs font-semibold text-orange-200 bg-orange-500/15 border border-orange-500/30 px-3 py-1.5 rounded-full group-hover:bg-orange-500/25 transition-colors">
                Book Now
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ThisWeekend() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch all events within the next ~7 days — best approximation via date filter
    // We filter by the weekend start date; backend returns events on or after this date
    eventsApi
      .getEvents({ date: todayISO(), limit: 12 })
      .then((res) => {
        // Keep events that fall within today → Sunday
        const end = weekendEndISO();
        const filtered = res.data.filter((e) => e.date && e.date <= end).slice(0, 8);
        setEvents(filtered.length > 0 ? filtered : res.data.slice(0, 8)); // fallback: show upcoming if nothing in range
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (!isLoading && events.length === 0) return null;

  return (
    <section className="py-24 px-6 relative">
      {/* Subtle warm accent line at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-orange-400 text-sm font-semibold uppercase tracking-widest">
                Limited Time
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[10px] font-bold">
                <Zap className="w-2.5 h-2.5" />
                Acts Fast
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white">
              🔥 This Weekend Highlights
            </h2>
            <p className="text-gray-500 text-sm mt-1">Happening soon — don&apos;t miss out.</p>
          </div>
          <Link
            href={`/events?date=${todayISO()}`}
            className="text-sm text-orange-400 hover:text-orange-300 font-semibold transition-colors hidden sm:block"
          >
            See all upcoming →
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-900/60 h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {events.map((event, i) => (
              <WeekendCard key={event.id} event={event} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
