'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { eventsApi } from '@/features/events/api/events.api';
import { useAuthStore } from '@/lib/authStore';
import { socketService } from '@/lib/socket';
import { formatINR } from '@/lib/formatINR';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventDetailsPage() {
  const [imageError, setImageError] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { user, hasHydrated } = useAuthStore();
  const isAuthenticated = !!user;

  const [realtimeSeats, setRealtimeSeats] = useState<number | null>(null);

  // Fetch Event Data
  const { data: eventData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getEventById(id!),
    enabled: !!id,
  });

  const event = eventData as any;

  // WebSocket Subscription
  useEffect(() => {
    if (!isAuthenticated || !id) return;

    const socket = socketService.connect();
    const handleSeatUpdate = (payload: { eventId: string; availableSeats: number }) => {
      if (payload.eventId === id) setRealtimeSeats(payload.availableSeats);
    };

    socket.on('event:seats-update', handleSeatUpdate);
    return () => { socket.off('event:seats-update', handleSeatUpdate); };
  }, [id, isAuthenticated]);

  if (!hasHydrated) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-[40vh] w-full animate-pulse bg-gray-100" />
        <div className="container mx-auto max-w-6xl px-4 -mt-32">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-80 h-[450px] animate-pulse rounded-3xl bg-gray-200 shadow-2xl" />
            <div className="flex-1 mt-32 md:mt-40 space-y-4">
              <div className="h-10 w-3/4 animate-pulse rounded-lg bg-gray-100" />
              <div className="h-6 w-1/2 animate-pulse rounded-lg bg-gray-50" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="container mx-auto py-32 text-center">
        <div className="mb-6 text-6xl">😕</div>
        <h2 className="text-2xl font-bold text-gray-900">Event Not Found</h2>
        <p className="mt-2 text-gray-500">The event you're looking for might have been removed or doesn't exist.</p>
        <button onClick={() => router.push('/events')} className="mt-8 rounded-xl bg-blue-600 px-8 py-3 font-bold text-white hover:bg-blue-700">
          Back to Marketplace
        </button>
      </div>
    );
  }

  const firstShow = event.shows?.[0];
  const theater = firstShow?.screen?.theater;
  const displaySeats = realtimeSeats ?? event.availableSeats;
  const isSoldOut = displaySeats <= 0;
  const isPast = new Date(event.date) < new Date();

  const typeLabels = {
    MOVIE: 'Cinematic Experience',
    CONCERT: 'Live Music Performance',
    EVENT: 'Stage & Theater',
    GENERAL_ADMISSION: 'Sports & Games'
  };

  return (
    <div className="min-h-screen bg-gray-50/30 pb-32">
      <div className="relative h-[65vh] w-full overflow-hidden bg-gray-950 z-0">
        {event.bannerUrl || event.posterUrl ? (
          <>
            {!bannerError ? (
              <Image
                src={bannerError ? '/placeholder.jpg' : (event.bannerUrl || event.posterUrl)}
                alt=""
                fill
                priority={true}
                quality={60}
                className="object-cover opacity-50"
                sizes="100vw"
                onError={() => setBannerError(true)}
              />
            ) : (
              <Image
                src="/placeholder.jpg"
                alt=""
                fill
                className="object-cover opacity-30"
                sizes="100vw"
              />
            )}
            
            {/* Multi-layered GPU-safe gradients for high-end cinematic feel and readability */}
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/90 via-transparent to-black/40" />
          </>
        ) : (
          <Image 
            src="/placeholder.jpg" 
            alt="" 
            fill
            className="object-cover opacity-30"
            sizes="100vw"
          />
        )}
      </div>

      <div className="container mx-auto max-w-7xl px-4 -mt-[45vh] relative z-10">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white mb-8 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          Back to Events
        </Link>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-start md:items-end">
          {/* Large Poster with Glassmorphism Border */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full md:w-[380px] shrink-0 relative z-20"
          >
            <div className="aspect-[2/3] min-h-[400px] overflow-hidden rounded-[3rem] bg-gray-900 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border-[12px] border-white/10 backdrop-blur-xl relative">
              {event.posterUrl && !imageError ? (
                <Image 
                  src={imageError ? '/placeholder.jpg' : event.posterUrl} 
                  alt={event.title} 
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <Image 
                  src="/placeholder.jpg" 
                  alt={event.title} 
                  fill
                  className="object-cover opacity-40"
                />
              )}

              {/* Poster Sold Out Overlay */}
              {isSoldOut && !isPast && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm">
                  <span className="rounded-full bg-red-600 px-8 py-3 text-sm font-black uppercase tracking-[0.3em] text-white shadow-2xl">
                    Sold Out
                  </span>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Event Highlights - Floating above the gradient */}
          <div className="flex-1 space-y-8 pb-4">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2.5">
                <span className="rounded-full bg-violet-600 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl shadow-violet-500/40">
                  {event.type}
                </span>
                {isPast && (
                   <span className="rounded-full bg-white/10 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md border border-white/20">
                    Event Completed
                   </span>
                )}
                {isSoldOut && !isPast && (
                   <span className="rounded-full bg-red-500 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl shadow-red-500/40">
                    Sold Out
                   </span>
                )}
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl">
                {event.title}
              </h1>
              <p className="text-xl font-bold text-violet-400 uppercase tracking-widest">
                {typeLabels[event.type as keyof typeof typeLabels] || 'Featured Experience'}
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm font-bold text-gray-500 uppercase tracking-widest italic">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗣</span> {event.language || 'English'}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">⏳</span> {event.duration || 120} Mins
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎭</span> {event.genre || 'Action / Drama'}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Info Tabs/Sections */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-3xl font-black text-white md:text-gray-900 mb-8 flex items-center gap-4">
                <span className="h-10 w-2 rounded-full bg-violet-600 shadow-[0_0_20px_rgba(124,58,237,0.5)]" />
                About the Event
              </h2>
              <p className="text-xl leading-relaxed text-gray-200 md:text-gray-800 font-medium whitespace-pre-line max-w-3xl tracking-normal">
                {event.description}
              </p>
            </section>

            <section className="grid sm:grid-cols-2 gap-6">
               <div className="rounded-3xl bg-white p-8 border border-gray-100 shadow-sm">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-4">Venue & Screen</span>
                  <h3 className="text-xl font-black text-gray-900">{theater?.name || event.location}</h3>
                  <p className="mt-1 text-gray-500 font-bold">{firstShow?.screen?.name || 'Main Hall'}</p>
                  <p className="mt-4 text-sm text-gray-400">{theater?.address || 'Address information available at checkout.'}</p>
               </div>
               <div className="rounded-3xl bg-white p-8 border border-gray-100 shadow-sm">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-4">Date & Time</span>
                  <h3 className="text-xl font-black text-gray-900">
                    {new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <p className="mt-1 text-gray-500 font-bold uppercase tracking-widest">
                    Doors open at {new Date(firstShow?.startTime || event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
               </div>
            </section>
          </div>

          <aside className="space-y-8">
             <div className="rounded-[3rem] bg-gray-950 p-10 text-white shadow-3xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/10 rounded-full -mr-24 -mt-24 blur-[100px]" />
                <span className="text-xs font-black uppercase tracking-widest text-violet-400 block mb-8">Ticketing Information</span>
                
                <div className="space-y-8">
                <div className="flex justify-between items-end">
                    <span className="text-gray-400 font-bold">Standard Price</span>
                    <span className="text-4xl font-black text-violet-400">{formatINR(firstShow?.basePrice || event.price)}</span>
                  </div>
                  
                  <div className="pt-8 border-t border-white/10 space-y-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 font-bold">Available Seats</span>
                      <span className={`font-black uppercase tracking-widest ${displaySeats < 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isSoldOut ? 'Sold Out' : `${displaySeats} Left`}
                      </span>
                    </div>
                  </div>
                </div>
 
                {!isPast && (
                  <button
                    disabled={isSoldOut}
                    onClick={() => firstShow?.id ? router.push(`/shows/${firstShow.id}`) : toast.error('Shows fully booked')}
                    className="mt-10 w-full rounded-2xl bg-violet-600 py-5 font-black transition-all hover:bg-violet-500 hover:scale-[1.02] active:scale-95 disabled:bg-gray-900 disabled:text-gray-600 shadow-2xl shadow-violet-600/40"
                  >
                    {isSoldOut ? 'Sold Out' : 'Confirm Booking'}
                  </button>
                )}

                {isPast && (
                   <div className="mt-8 w-full rounded-2xl bg-white/5 border border-white/10 py-4 text-center font-black text-gray-500">
                     Event Completed
                   </div>
                )}
             </div>

             <div className="rounded-[2rem] border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm font-bold text-gray-500">Need corporate booking or bulk tickets?</p>
                <Link href="#" className="mt-2 inline-block text-sm font-black text-blue-600 hover:underline">Contact Sales &rarr;</Link>
             </div>
          </aside>
        </div>
      </div>

      {/* Mobile Sticky Booking Bar */}
      <AnimatePresence>
        {!isPast && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-2xl border-t border-gray-100 p-4 md:hidden"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Price</span>
                <span className="text-xl font-black text-gray-900">{formatINR(firstShow?.basePrice || event.price)}</span>
              </div>
              <button
                disabled={isSoldOut}
                onClick={() => firstShow?.id && router.push(`/shows/${firstShow.id}`)}
                className="flex-1 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-violet-500/30 disabled:bg-gray-200"
              >
                {isSoldOut ? 'Sold Out' : 'Book Tickets'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}