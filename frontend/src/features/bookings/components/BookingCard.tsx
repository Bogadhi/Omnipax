import React, { useState } from 'react';
import { BookingDto, cancelBooking, getPaidAmount } from '../api/bookings.api';
import { Calendar, MapPin, Ticket, XCircle, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { formatINR } from '@/lib/formatINR';

interface BookingCardProps {
  booking: BookingDto;
  /** Called after a successful cancellation so the parent can refresh its list */
  onCancelled?: (bookingId: string) => void;
}

// ─── Status badge config ────────────────────────────────────────────────────
type StatusConfig = {
  label: string;
  className: string;
  icon: React.ReactNode;
};

function getStatusConfig(status: BookingDto['status']): StatusConfig {
  switch (status) {
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        className: 'bg-green-500/10 text-green-400 border-green-500/20',
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        icon: <XCircle className="w-3 h-3" />,
      };
    case 'REFUND_INITIATED':
      return {
        label: 'Refund in Progress',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        icon: <RefreshCw className="w-3 h-3 animate-spin" />,
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        className: 'bg-green-500/10 text-green-400 border-green-500/20',
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    case 'REFUND_FAILED':
      return {
        label: 'Refund Failed',
        className: 'bg-red-500/10 text-red-400 border-red-500/20',
        icon: <AlertCircle className="w-3 h-3" />,
      };
    default:
      return {
        label: status,
        className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        icon: null,
      };
  }
}

// ─── Refund status panel ────────────────────────────────────────────────────
function RefundPanel({ booking }: { booking: BookingDto }) {
  const { status, paidAmount, refundedAt, razorpayRefundId } = booking;

  if (status === 'REFUND_INITIATED') {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-400">Refund in progress</p>
          <p className="mt-0.5 text-xs text-amber-400/70">
            Your refund of <strong>{formatINR(paidAmount)}</strong> will reflect in 5–7 business days.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'REFUNDED') {
    return (
      <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <p className="text-sm font-semibold text-green-400">Refund completed</p>
        </div>
        <div className="space-y-1 text-xs text-green-400/70">
          <p>
            <span className="text-green-400/50 uppercase tracking-wider mr-1">Refund Amount</span>
            <strong className="text-green-300">{formatINR(paidAmount)}</strong>
          </p>
          {refundedAt && (
            <p>
              <span className="text-green-400/50 uppercase tracking-wider mr-1">Refunded On</span>
              {new Date(refundedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </p>
          )}
          {razorpayRefundId && (
            <p>
              <span className="text-green-400/50 uppercase tracking-wider mr-1">Refund ID</span>
              <span className="font-mono">{razorpayRefundId}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'REFUND_FAILED') {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <div>
          <p className="text-sm font-semibold text-red-400">Refund failed</p>
          <p className="mt-0.5 text-xs text-red-400/70">
            We could not process your refund automatically. Please{' '}
            <a href="mailto:support@starpass.app" className="underline hover:text-red-300">
              contact support
            </a>{' '}
            with your Booking ID.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Main component ─────────────────────────────────────────────────────────
export const BookingCard: React.FC<BookingCardProps> = ({ booking, onCancelled }) => {
  const [isCancelling, setIsCancelling] = useState(false);

  const date = new Date(booking.startTime).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = new Date(booking.startTime).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;
    setIsCancelling(true);
    try {
      await cancelBooking(booking.id);
      toast.success('Booking cancelled. Refund has been initiated.');
      onCancelled?.(booking.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  // Cancel is ONLY allowed when the booking is CONFIRMED.
  // Once in any refund lifecycle state, the cancel button is hidden entirely.
  const canCancel = booking.status === 'CONFIRMED';
  const isCancelled =
    booking.status === 'CANCELLED' ||
    booking.status === 'REFUND_INITIATED' ||
    booking.status === 'REFUNDED' ||
    booking.status === 'REFUND_FAILED';

  const paidAmount = getPaidAmount(booking);
  const statusConfig = getStatusConfig(booking.status);

  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col md:flex-row shadow-lg transition-all duration-300 ${
        isCancelled ? 'opacity-80' : 'hover:shadow-xl'
      }`}
    >
      {/* Poster */}
      <div className="w-full md:w-1/3 lg:w-1/4 h-48 md:h-auto relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={booking.posterUrl}
          alt={booking.eventTitle}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent md:bg-gradient-to-r" />
        {isCancelled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="bg-gray-800/90 text-gray-300 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border border-gray-700">
              {booking.status === 'CANCELLED' ? 'Cancelled' : booking.status.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">{booking.eventTitle}</h3>

          <div className="space-y-2 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-400" />
              <span>{date} • {time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-400" />
              <span>{booking.theater}, {booking.screen}</span>
            </div>
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-brand-400" />
              <span>Seats: <span className="text-white font-medium">{booking.seats.join(', ')}</span></span>
            </div>
          </div>

          {/* Refund lifecycle panel */}
          <RefundPanel booking={booking} />
        </div>

        <div className="mt-6 flex justify-between items-end border-t border-gray-800 pt-4">
          {/* Amount */}
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              {(booking.discountAmount ?? 0) > 0 ? 'Amount Paid' : 'Total Amount'}
            </span>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-bold text-brand-400">{formatINR(paidAmount)}</p>
              {(booking.discountAmount ?? 0) > 0 && (
                <span className="text-xs text-gray-500 line-through">
                  {formatINR(booking.totalAmount)}
                </span>
              )}
            </div>
            {(booking.discountAmount ?? 0) > 0 && (
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">
                Saved {formatINR(booking.discountAmount!)} 🎉
              </span>
            )}
          </div>

          {/* Cancel + status badge */}
          <div className="flex items-center gap-4">
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {isCancelling ? 'Cancelling…' : 'Cancel Booking'}
              </button>
            )}

            <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${statusConfig.className}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </div>
          </div>
        </div>
      </div>

      {/* QR Code — only for CONFIRMED bookings */}
      {booking.status === 'CONFIRMED' && (
        <div className="bg-white p-4 flex flex-col items-center justify-center md:border-l border-gray-800 min-w-[150px]">
          {booking.qrToken ? (
            <QRCodeCanvas value={booking.qrToken} size={100} />
          ) : (
            <div className="w-[100px] h-[100px] bg-gray-200 flex items-center justify-center text-xs text-gray-500 text-center">
              No QR
            </div>
          )}
          <p className="text-black text-[10px] font-mono mt-2 text-center tracking-widest">
            {booking.qrToken ? booking.qrToken.substring(0, 8) : '---'}...
          </p>
          <p className="text-gray-500 text-[9px] mt-1 uppercase tracking-wider">Scan for Entry</p>
        </div>
      )}
    </div>
  );
};
