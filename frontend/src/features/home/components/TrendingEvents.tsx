'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { eventsApi, Event } from '@/features/events/api/events.api';
import { formatINR } from '@/lib/formatINR';
import { EventType } from '@shared';

function EventCard({ event }: { event: Event }) {
  const dateStr = new Date(event.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const venue = (event as any).shows?.[0]?.screen?.theater?.name ?? 'Venue TBA';

  return (
    <Link href={`/events/${event.id}`} className="group block flex-shrink-0 w-72 md:w-80">
      <div className="relative rounded-2xl overflow-hidden border border-white/8 bg-gray-900 hover:border-violet-500/30 transition-all duration-300">
        {/* Banner image */}
        <div className="w-full h-44 relative overflow-hidden bg-gray-800">
          {event.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.posterUrl}
              alt={event.title}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🎤</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />

          {/* Type badge */}
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-black/60 border border-white/15 text-white backdrop-blur-sm">
            {event.type === EventType.CONCERT ? '🎤 Concert' : event.type === 'EVENT' ? '🎭 Event' : '🏟 General'}
          </span>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-bold text-white text-sm mb-1 line-clamp-1">{event.title}</h3>

          <p className="text-xs text-gray-500 mb-1 line-clamp-1">📍 {venue}</p>
          <p className="text-xs text-gray-500 mb-4">📅 {dateStr}</p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Starting from</p>
              <p className="text-violet-400 font-bold text-sm">{formatINR(event.price)}</p>
            </div>
            <span className="text-xs font-semibold text-violet-300 bg-violet-500/15 border border-violet-500/30 px-3 py-1.5 rounded-full group-hover:bg-violet-500/25 transition-colors">
              Book Now
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function TrendingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch concerts + general events
    Promise.all([
      eventsApi.getEvents({ type: EventType.CONCERT, limit: 6 }),
      eventsApi.getEvents({ type: 'EVENT' as any, limit: 4 }),
    ])
      .then(([concerts, events]) => {
        const combined = [...concerts.data, ...events.data].slice(0, 10);
        setEvents(combined);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
    }
  };

  if (!isLoading && events.length === 0) return null;

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <span className="text-violet-400 text-sm font-semibold uppercase tracking-widest">Live &amp; Upcoming</span>
            <h2 className="text-3xl md:text-4xl font-black text-white mt-2">Trending Live Events</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-violet-500/20 hover:border-violet-500/40 flex items-center justify-center transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4 text-gray-300" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-violet-500/20 hover:border-violet-500/40 flex items-center justify-center transition-all duration-200"
            >
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
            <Link href={`/events?type=${EventType.CONCERT}`} className="text-sm text-violet-400 hover:text-violet-300 font-semibold transition-colors ml-2 hidden sm:block">
              See all →
            </Link>
          </div>
        </motion.div>

        {/* Horizontal scroll */}
        {isLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-72 md:w-80 rounded-2xl bg-gray-900 h-60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {events.map((event) => (
              <div key={event.id} className="snap-start">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
