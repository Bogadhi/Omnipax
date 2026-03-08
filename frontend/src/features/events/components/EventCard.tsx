'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatINR } from '@/lib/formatINR';
import { motion } from 'framer-motion';

interface EventCardProps {
  event: any;
}

export function EventCard({ event }: EventCardProps) {
  const [imageError, setImageError] = useState(false);
  const firstShow = event.shows?.[0];
  const isSoldOut = event.availableSeats <= 0;
  const isPast = new Date(event.date) < new Date();

  const typeConfig = {
    MOVIE: { label: 'Movie', bg: 'bg-violet-500/10', text: 'text-violet-600', dot: 'bg-violet-600' },
    CONCERT: { label: 'Concert', bg: 'bg-pink-500/10', text: 'text-pink-600', dot: 'bg-pink-600' },
    EVENT: { label: 'Stage Show', bg: 'bg-amber-500/10', text: 'text-amber-600', dot: 'bg-amber-600' },
    GENERAL_ADMISSION: { label: 'Sports', bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-600' },
  };

  const config = typeConfig[event.type as keyof typeof typeConfig] || typeConfig.EVENT;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/events/${event.id}`} className="group block">
        <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-sm transition-all duration-300 group-hover:shadow-2xl group-hover:border-blue-100 group-hover:-translate-y-1.5 h-full">
          {/* Card Image Area - FIXED ASPECT TO PREVENT CLS */}
          <div className="aspect-[2/3] min-h-[300px] overflow-hidden relative bg-gray-950">
            {event.posterUrl && !imageError ? (
              <Image
                src={imageError ? '/placeholder.jpg' : event.posterUrl}
                alt={event.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={() => setImageError(true)}
              />
            ) : (
              <Image
                src="/placeholder.jpg"
                alt={event.title}
                fill
                className="object-cover opacity-50 transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            )}
            
            {/* Dark gradient for text readability and cinematic depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />

            {/* Sold Out Cinematic Overlay */}
            {isSoldOut && !isPast && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-950/60 backdrop-blur-[1px]">
                <div className="border-y border-white/20 py-2 w-full text-center bg-white/5 backdrop-blur-md">
                  <span className="text-sm font-black uppercase tracking-[0.3em] text-white drop-shadow-2xl">
                    Sold Out
                  </span>
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest backdrop-blur-xl border border-white/20 shadow-xl ${config.bg} ${config.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${config.dot} animate-pulse`} />
                {config.label}
              </span>
              
              {isPast && (
                <span className="inline-flex items-center rounded-full bg-black/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-xl border border-white/10 shadow-xl">
                  Completed
                </span>
              )}
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20">
              <span className="rounded-full bg-white px-5 py-2 text-xs font-bold text-black shadow-2xl">
                View Details
              </span>
            </div>
          </div>

          {/* Details Area */}
          <div className="p-5 flex flex-col flex-1">
            <h3 className="line-clamp-1 text-lg font-black text-gray-900 group-hover:text-violet-600 transition-colors duration-300">
              {event.title}
            </h3>
            
            <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="line-clamp-1">
                {firstShow?.screen?.theater?.name || event.location || 'Location TBA'}
              </span>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Starts From</span>
                <span className="text-xl font-black text-violet-600">
                  {formatINR(firstShow?.basePrice || firstShow?.price || 0)}
                </span>
              </div>
              
              {!isPast && !isSoldOut && event.availableSeats < 50 && (
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">Filling Fast</span>
                   <span className="text-[11px] font-bold text-gray-400">{event.availableSeats} Left</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
