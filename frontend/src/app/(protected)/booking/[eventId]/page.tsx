'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { eventsApi } from '@/features/events/api/events.api';
import { bookingApi } from '@/features/booking/api/booking.api';
import { SeatGrid } from '@/features/booking/components/SeatGrid';
import { useAuthStore } from '@/lib/authStore';
import { socketService } from '@/lib/socket';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import AuthGuard from '@/components/auth/AuthGuard';

// ─── Types matching the backend seatAvailability response ───────────────────
interface SeatDetails {
  id: string;
  row: string;
  number: number;
  type: string;
}

interface SeatAvailability {
  seatId: string;
  status: string;   // "AVAILABLE" | "BOOKED" | "LOCKED"
  seat: SeatDetails;
}

interface ShowWithSeats {
  id: string;
  startTime: string;
  seatAvailability: SeatAvailability[];
}

// ─── Razorpay script loader ──────────────────────────────────────────────────
const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ─── Page ────────────────────────────────────────────────────────────────────
export default function BookingPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  // Optional: show ID can be passed as ?showId=xxx to target a specific show
  const showIdParam = searchParams.get('showId');

  const router = useRouter();
  const { user } = useAuthStore();

  // Seat selection is done by seatNumber string like "A1", "B3"
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<string[]>([]);
  const [liveSeatStatuses, setLiveSeatStatuses] = useState<Record<string, string>>({});
  const [idempotencyKey] = useState(() => uuidv4());

  // ── 1. Fetch Event (includes shows → seatAvailability → seat) ───────────
  const { data: event, isLoading: isEventLoading, isError } = useQuery({
    queryKey: ['event-with-seats', eventId],
    queryFn: async () => {
      const res = await eventsApi.getEventById(eventId!);
      return res as any; // backend returns full relational event
    },
    enabled: !!eventId,
  });

  // ── 2. Derive the show to display (first, or query-param-targeted) ───────
  const activeShow: ShowWithSeats | null = useMemo(() => {
    if (!event?.shows?.length) return null;
    if (showIdParam) {
      return (event.shows as ShowWithSeats[]).find((s) => s.id === showIdParam) ?? event.shows[0];
    }
    return event.shows[0] as ShowWithSeats;
  }, [event, showIdParam]);

  // ── 3. Seat availability objects (mutable via WebSocket updates) ─────────
  const seats: SeatAvailability[] = useMemo(() => {
    if (!activeShow?.seatAvailability) return [];
    return activeShow.seatAvailability.map((sa) => ({
      ...sa,
      // Live status override (from WebSocket events)
      status: liveSeatStatuses[sa.seatId] ?? sa.status,
    }));
  }, [activeShow, liveSeatStatuses]);

  // ── 4. WebSocket for real-time seat updates ──────────────────────────────
  useEffect(() => {
    if (!activeShow?.id) return;
    const socket = socketService.connect();
    socket.emit('join_show', { showId: activeShow.id });

    const handleSeatLocked = (payload: { showId: string; seatId: string }) => {
      if (payload.showId === activeShow.id) {
        setLiveSeatStatuses((prev) => ({ ...prev, [payload.seatId]: 'LOCKED' }));
        // Auto-deselect if we had this seat selected
        const seatObj = seats.find((s) => s.seatId === payload.seatId);
        if (seatObj) {
          const seatCode = `${seatObj.seat.row}${seatObj.seat.number}`;
          setSelectedSeatNumbers((prev) => prev.filter((n) => n !== seatCode));
        }
      }
    };

    const handleSeatReleased = (payload: { showId: string; seatId: string }) => {
      if (payload.showId === activeShow.id) {
        setLiveSeatStatuses((prev) => {
          const next = { ...prev };
          delete next[payload.seatId];
          return next;
        });
      }
    };

    const handleSeatBooked = (payload: { showId: string; seatId: string }) => {
      if (payload.showId === activeShow.id) {
        setLiveSeatStatuses((prev) => ({ ...prev, [payload.seatId]: 'BOOKED' }));
      }
    };

    socket.on('seat_locked', handleSeatLocked);
    socket.on('seat_released', handleSeatReleased);
    socket.on('seat_booked', handleSeatBooked);

    return () => {
      socket.off('seat_locked', handleSeatLocked);
      socket.off('seat_released', handleSeatReleased);
      socket.off('seat_booked', handleSeatBooked);
    };
  }, [activeShow?.id]);

  // ── 5. Seat selection handler ─────────────────────────────────────────────
  const handleSelect = useCallback((seatNumber: string) => {
    setSelectedSeatNumbers((prev) => {
      if (prev.includes(seatNumber)) {
        return prev.filter((n) => n !== seatNumber);
      }
      if (prev.length >= 6) {
        toast.warning('Max 6 seats allowed per booking');
        return prev;
      }
      return [...prev, seatNumber];
    });
  }, []);

  // ── 6. Booking mutation ───────────────────────────────────────────────────
  const createBookingMutation = useMutation({
    mutationFn: () =>
      bookingApi.createBooking({
        showId: activeShow!.id,
        seatNumbers: selectedSeatNumbers,
        idempotencyKey,
      }),

    onSuccess: async (data) => {
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Razorpay SDK failed to load');
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency ?? 'INR',
        name: 'Ticket Booking App',
        description: `Booking for ${event?.title}`,
        order_id: data.razorpayOrderId ?? data.orderId,
        handler: async (response: any) => {
          try {
            await bookingApi.verifyPayment({
              bookingId: data.bookingId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            router.push(`/booking/success/${data.bookingId}`);
          } catch {
            router.push('/booking/failure');
          }
        },
        prefill: { name: user?.name || user?.email, email: user?.email },
        theme: { color: '#2563eb' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    },

    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Booking failed';
      toast.error(msg);
      if (err.response?.status === 409) {
        // Seat collision: deselect all and let user re-pick
        setSelectedSeatNumbers([]);
        toast.info('Please re-select your seats');
      }
    },
  });

  // ── 7. Computed pricing ───────────────────────────────────────────────────
  const pricePerSeat = Number(event?.price ?? 0);
  const totalPrice = selectedSeatNumbers.length * pricePerSeat;

  // ── Render ────────────────────────────────────────────────────────────────
  if (isEventLoading) return <div className="p-10 text-center">Loading event info...</div>;
  if (isError || !event) return <div className="p-10 text-center text-red-500">Failed to load event</div>;
  if (!activeShow) return <div className="p-10 text-center text-yellow-600">No shows available for this event</div>;
  if (seats.length === 0) return <div className="p-10 text-center text-gray-500">No seat data available</div>;

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-bold">Booking: {event.title}</h1>
        <p className="mb-6 text-gray-500 text-sm">
          Show: {activeShow.startTime ? new Date(activeShow.startTime).toLocaleString() : 'N/A'}
        </p>

        <div className="mb-8 rounded-lg border p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Select Seats</h2>

          {/* SeatGrid expects: seats (SeatAvailability[]), selectedSeatNumbers (string[]), onSelect */}
          <SeatGrid
            seats={seats}
            selectedSeatNumbers={selectedSeatNumbers}
            onSelect={handleSelect}
          />
        </div>

        {/* Pricing + CTA */}
        <div className="flex flex-col items-center justify-between gap-4 rounded-lg bg-gray-50 p-6 sm:flex-row">
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-3xl font-bold text-blue-600">₹{totalPrice}</p>
            <p className="text-sm text-gray-500">
              {selectedSeatNumbers.length} seat{selectedSeatNumbers.length !== 1 ? 's' : ''} ×&nbsp;₹{pricePerSeat}
              {selectedSeatNumbers.length > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  ({selectedSeatNumbers.join(', ')})
                </span>
              )}
            </p>
          </div>

          <button
            onClick={() => createBookingMutation.mutate()}
            disabled={createBookingMutation.isPending || selectedSeatNumbers.length === 0}
            className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
          >
            {createBookingMutation.isPending ? 'Processing...' : 'Confirm & Pay'}
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
