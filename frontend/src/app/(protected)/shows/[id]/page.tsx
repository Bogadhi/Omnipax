'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seatsApi, Seat } from '@/features/seats/api/seats.api';
import { eventsApi } from '@/features/events/api/events.api';
import { SeatGrid } from '@/features/seats/components/SeatGrid';
import { BookingSummary } from '@/features/seats/components/BookingSummary';
import { LockTimer } from '@/features/seats/components/LockTimer';
import { useAuthStore } from '@/lib/authStore';
import toast from 'react-hot-toast';

export default function ShowSeatsPage() {
  const { id: showId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<string[]>([]);
  const [gaQuantity, setGaQuantity] = useState<number>(1);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [ticketPrice, setTicketPrice] = useState<number>(0);
  const [showType, setShowType] = useState<'SEATED' | 'GENERAL_ADMISSION'>('SEATED');
  const [remainingCapacity, setRemainingCapacity] = useState<number>(0);

  // 1. Fetch Seats
  const { data: seats = [], isLoading, isError } = useQuery<Seat[]>({
    queryKey: ['seats', showId],
    queryFn: () => seatsApi.getSeats(showId!),
    enabled: !!showId && showType === 'SEATED',
  });

  // 2. Fetch Show Details
  useQuery({
    queryKey: ['show-details', showId],
    queryFn: async () => {
      const result = await eventsApi.getEvents({}) as any;
      const events = result?.data ?? [];
      for (const event of events) {
        const show = (event?.shows ?? []).find((s: any) => s.id === showId);
        if (show) {
          setTicketPrice(Number(show.price || event.price || 0));
          setShowType(event.type === 'GENERAL_ADMISSION' ? 'GENERAL_ADMISSION' : 'SEATED');
          setRemainingCapacity(show.remainingCapacity || 0);
          return show;
        }
      }
      return null;
    },
    enabled: !!showId,
  });

  // 2.5 Pricing
  const qty = showType === 'SEATED' ? selectedSeatNumbers.length : gaQuantity;
  const { data: pricingBreakdown } = useQuery({
    queryKey: ['pricing-calculate', showId, qty, ticketPrice],
    queryFn: () => seatsApi.calculatePricing(showId!, qty, ticketPrice),
    enabled: !!showId && qty > 0 && ticketPrice > 0,
  });

  // 3. Mutations
  const lockMutation = useMutation({
    mutationFn: () => 
      showType === 'SEATED' 
        ? seatsApi.lockSeats(showId!, selectedSeatNumbers)
        : seatsApi.lockGeneralAdmission(showId!, gaQuantity),
    
    onSuccess: (data: any) => {
      toast.success('Session locked! Proceed to pay.');
      setLockedUntil(new Date(Date.now() + 5 * 60 * 1000).toISOString());
      setBookingId(data.bookingId);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to initiate booking');
      if (showType === 'SEATED') {
        setSelectedSeatNumbers([]); 
        queryClient.invalidateQueries({ queryKey: ['seats', showId] });
      }
    },
  });

  // Derived State
  const selectedSeatsObject = useMemo(() => 
    seats.filter(s => selectedSeatNumbers.includes(`${s.row}${s.number}`)), 
  [seats, selectedSeatNumbers]);

  // Handlers
  const handleSeatToggle = (seatNumber: string) => {
    if (lockedUntil) {
      toast('Release your current session before selecting new seats.', { icon: '🔒' });
      return; 
    }

    setSelectedSeatNumbers(prev => 
      prev.includes(seatNumber) 
        ? prev.filter(s => s !== seatNumber) 
        : [...prev, seatNumber]
    );
  };

  const handleLockSession = () => {
    const { user, token } = useAuthStore.getState();
    if (!user || !token) {
      toast.error('Please login to book tickets');
      router.push(`/login?redirect=/shows/${showId}`);
      return;
    }
    lockMutation.mutate();
  };

  const handleTimerExpire = () => {
    toast('Booking session expired', { icon: '⏰' });
    setLockedUntil(null);
    setSelectedSeatNumbers([]);
    setGaQuantity(1);
    queryClient.invalidateQueries({ queryKey: ['seats', showId] });
    queryClient.invalidateQueries({ queryKey: ['show-details', showId] });
  };

  // 🎯 REFACTOR: No longer creates Razorpay order here.
  // Redirect to /checkout so user can apply discounts BEFORE order creation.
  const handleGoToCheckout = () => {
    if (!bookingId) {
      toast.error('Booking session invalid');
      return;
    }
    router.push(`/checkout?bookingId=${bookingId}`);
  };

  if (isLoading) return <div className="p-10 text-center text-gray-400">Loading...</div>;
  if (isError) return <div className="p-10 text-center text-red-500">Failed to load show details</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="container mx-auto px-4 pt-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          {showType === 'GENERAL_ADMISSION' ? 'Select Quantity' : 'Select Seats'}
        </h1>
        
        {lockedUntil && (
          <div className="mb-6 flex flex-col items-center gap-2 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
             <LockTimer expiresAt={lockedUntil} onExpire={handleTimerExpire} />
             <p className="text-sm text-yellow-800 font-medium font-mono uppercase tracking-tighter">Seats Reserved for limited time</p>
          </div>
        )}

        {showType === 'SEATED' ? (
          <>
            <div className="mb-8 flex flex-wrap justify-center gap-6 text-xs sm:text-sm">
              <div className="flex items-center gap-2"><div className="h-5 w-5 rounded-md bg-white border border-gray-300"></div> Available</div>
              <div className="flex items-center gap-2"><div className="h-5 w-5 rounded-md bg-blue-600"></div> Selected</div>
              <div className="flex items-center gap-2"><div className="h-5 w-5 rounded-md bg-yellow-400"></div> Locked</div>
              <div className="flex items-center gap-2"><div className="h-5 w-5 rounded-md bg-red-500"></div> Booked</div>
            </div>

            <SeatGrid 
              seats={seats} 
              selectedSeatNumbers={selectedSeatNumbers} 
              currentUserId={user?.id || null}
              onSeatToggle={handleSeatToggle}
            />
          </>
        ) : (
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border">
             <p className="text-gray-500 mb-2 uppercase text-xs font-bold tracking-widest text-center">General Admission</p>
             <h2 className="text-2xl font-bold text-center mb-6">Quantity Selector</h2>
             
             <div className="flex items-center justify-center gap-8 mb-8">
                <button 
                  onClick={() => setGaQuantity(q => Math.max(1, q - 1))}
                  className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-2xl hover:border-blue-600 transition-colors"
                >-</button>
                <span className="text-4xl font-black w-12 text-center">{gaQuantity}</span>
                <button 
                  onClick={() => setGaQuantity(q => q + 1)}
                  className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-2xl hover:border-blue-600 transition-colors"
                >+</button>
             </div>
             
             <p className="text-center text-sm text-gray-500">
               {remainingCapacity} tickets available
             </p>
          </div>
        )}

        <div className="h-32"></div> {/* Spacer */}

        {!lockedUntil && (
          <BookingSummary 
            selectedSeatsCount={qty}
            selectedSeats={showType === 'SEATED' ? selectedSeatsObject : undefined}
            breakdown={pricingBreakdown}
            isProcessing={lockMutation.isPending}
            onConfirm={handleLockSession}
          />
        )}
        
        {lockedUntil && (
          <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-6 shadow-2xl z-40 animate-in slide-in-from-bottom duration-300">
             <div className="container mx-auto flex flex-col items-center gap-4">
                <div className="text-center">
                   <p className="font-black text-green-600 text-xl">SESSION LOCKED ✓</p>
                   <p className="text-sm text-gray-400">Apply discounts and complete payment on the next page.</p>
                </div>
                
                <button 
                   className="w-full sm:w-auto rounded-xl bg-green-600 px-16 py-5 font-black text-white shadow-xl hover:bg-green-700 transition-all hover:scale-105 active:scale-95 text-lg uppercase tracking-wider"
                   onClick={handleGoToCheckout}
                >
                  Proceed to Checkout →
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
