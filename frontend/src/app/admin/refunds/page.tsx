'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/authStore';
import { RefreshCw, Search, AlertCircle } from 'lucide-react';
import { formatINR } from '@/lib/formatINR';

interface Booking {
  id: string;
  totalAmount: number;
  discountAmount?: number;
  finalAmount?: number;
  paymentId: string;
  status: string;
  createdAt: string;
  user: {
      email: string;
      name: string;
  }
}

export default function RefundQueue() {
  const { token } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRefunds = async () => {
    setIsLoading(true);
    try {
      // Fetch both CANCELLED and FAILED bookings
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/bookings?status=CANCELLED,FAILED`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Failed to fetch refunds', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchRefunds();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-primary" />
          Refund Queue
        </h1>
        <button 
            onClick={fetchRefunds}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 font-medium text-foreground/60">Booking ID</th>
                <th className="p-4 font-medium text-foreground/60">User</th>
                <th className="p-4 font-medium text-foreground/60">Amount</th>
                <th className="p-4 font-medium text-foreground/60">Payment ID</th>
                <th className="p-4 font-medium text-foreground/60">Status</th>
                <th className="p-4 font-medium text-foreground/60">Date</th>
                <th className="p-4 font-medium text-foreground/60">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-xs">{booking.id}</td>
                    <td className="p-4">
                        <div className="font-medium">{booking.user.name}</div>
                        <div className="text-xs text-foreground/40">{booking.user.email}</div>
                    </td>
                    <td className="p-4 font-bold">
                      {formatINR((booking.discountAmount ?? 0) > 0 && booking.finalAmount != null
                        ? booking.finalAmount
                        : booking.totalAmount)}
                      {(booking.discountAmount ?? 0) > 0 && (
                        <span className="block text-[10px] text-gray-500 line-through font-normal">
                          was {formatINR(booking.totalAmount)}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs">{booking.paymentId || 'N/A'}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'CANCELLED'
                            ? 'bg-red-400/10 text-red-400'
                            : 'bg-orange-400/10 text-orange-400'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="p-4 text-foreground/60">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                        <button disabled className="px-3 py-1 rounded bg-white/5 text-foreground/40 text-xs cursor-not-allowed">
                            Process Refund (Wave 2)
                        </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-foreground/40 flex flex-col items-center gap-2">
                    <AlertCircle className="w-8 h-8 opacity-20" />
                    No refunds pending
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
