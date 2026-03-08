'use client';

import Link from 'next/link';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface EventProps {
  event: {
    id: string;
    title: string;
    description: string;
    posterUrl: string;
    type: string;
  };
}

export default function EventCard({ event }: EventProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="glass-card overflow-hidden group border-white/5"
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={event.posterUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1000'}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 bg-primary/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          {event.type}
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <p className="text-foreground/60 text-sm line-clamp-2 mb-4 leading-relaxed">
          {event.description}
        </p>
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex items-center gap-2 text-xs text-foreground/70">
            <Calendar className="w-4 h-4 text-primary" />
            <span>Multiple Dates Available</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground/70">
            <MapPin className="w-4 h-4 text-primary" />
            <span>Premium Venues</span>
          </div>
        </div>
        <Link
          href={`/events/${event.id}`}
          className="block w-full text-center bg-white/5 hover:bg-primary text-white font-semibold py-3 rounded-lg transition-all border border-white/10 hover:border-primary/50"
        >
          Book Now
        </Link>
      </div>
    </motion.div>
  );
}
