'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Calendar, MapPin, Ticket } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { useAuthStore } from '@/lib/authStore';
import api from '@/lib/api';

function SuccessContent() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuthStore();

  useEffect(() => {
    if (!bookingId) {
      router.replace('/events');
      return;
    }

    const fetchBooking = async () => {
      try {
        console.log(`[BookingSuccess] Fetching booking: ${bookingId}`);
        const res = await api.get(`/bookings/${bookingId}`); 
        const found = res.data;
        
        if (found) {
          console.log('[BookingSuccess] Payload:', found);
          setBooking(found);
        }
      } catch (err) {
        console.error('Failed to load booking details', err);
        setError('Unable to load booking details. Please check My Bookings.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <Link href="/profile/bookings" className="text-primary hover:underline font-bold">
          Go to My Bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full mb-6">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      
      <h1 className="text-3xl font-black mb-4">Booking Confirmed!</h1>
      <p className="text-foreground/60 mb-8">
        Your tickets have been secured. A confirmation email has been sent to {user?.email}.
      </p>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
        <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-foreground/40 font-bold mb-1">Booking ID</p>
            <p className="font-mono text-lg">{bookingId}</p>
          </div>
          <div className="text-right">
             <p className="text-xs uppercase tracking-widest text-foreground/40 font-bold mb-1">Amount Paid</p>
             {(booking?.discountAmount ?? 0) > 0 ? (
               <div className="flex flex-col items-end gap-0.5">
                 <p className="text-xl font-bold text-primary">₹{booking.finalAmount ?? booking.totalAmount}</p>
                 <p className="text-xs text-foreground/40 line-through">₹{booking.totalAmount}</p>
                 <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">You saved ₹{booking.discountAmount} 🎉</span>
               </div>
             ) : (
               <p className="text-xl font-bold text-primary">₹{booking?.totalAmount || '---'}</p>
             )}
          </div>
        </div>

        {booking && (
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
                <div className="flex items-start gap-4">
                    <Calendar className="w-5 h-5 text-foreground/40 mt-1" />
                    <div>
                        <p className="font-bold">{booking.show?.event?.title || 'Event'}</p>
                        <p className="text-sm text-foreground/60">
                            {new Date(booking.show?.startTime).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-foreground/40 mt-1" />
                    <div>
                        <p className="font-bold">{booking.show?.screen?.theater?.name || 'Theater'}</p>
                        <p className="text-sm text-foreground/60">
                            {booking.show?.screen?.name || 'Screen'}
                        </p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <Ticket className="w-5 h-5 text-foreground/40 mt-1" />
                    <div>
                        <p className="font-bold">
                            {booking.bookingSeats?.length} x Seats
                        </p>
                        <p className="text-sm text-foreground/60">
                            {booking.bookingSeats?.map((s: any) => s.seat.row + s.seat.number).join(', ')}
                        </p>
                    </div>
                </div>
            </div>

            {booking.qrToken && (
               <div className="bg-white p-4 rounded-xl shadow-inner">
                  <QRCode 
                    value={booking.qrToken} 
                    size={160}
                    level="H"
                  />
                  <p className="text-[10px] text-center mt-2 text-gray-400 font-mono">SCAN AT ENTRANCE</p>
               </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link 
          href="/events"
          className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors"
        >
          Book Another
        </Link>
        <Link 
          href="/profile/bookings"
          className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all"
        >
          View My Bookings
        </Link>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-background pt-8 px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
