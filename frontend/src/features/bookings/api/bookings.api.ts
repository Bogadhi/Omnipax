import { api } from '@/lib/api';

export interface BookingDto {
  id: string;
  qrToken: string;
  status:
    | 'INITIATED'
    | 'LOCKED'
    | 'PAYMENT_PENDING'
    | 'CONFIRMED'
    | 'FAILED'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'REFUND_INITIATED'
    | 'REFUNDED'
    | 'REFUND_FAILED';

  // Amount fields (from backend mapBookingToDto)
  totalAmount: number;
  /** Amount discounted via coupon or gift card. */
  discountAmount?: number;
  couponDiscountAmount?: number;
  giftCardDiscountAmount?: number;
  /** Subtotal after discount. */
  finalAmount?: number;
  /**
   * The amount the customer actually paid.
   * Derived on backend: discountAmount > 0 ? finalAmount : totalAmount.
   * Use this field for display and refund references — never recompute.
   */
  paidAmount: number;

  // Discount codes (for display)
  couponCode?: string | null;
  giftCardCode?: string | null;

  // Event / show fields
  eventTitle: string;
  posterUrl: string;
  startTime: string;
  theater: string;
  screen: string;
  seats: string[];

  // Timestamps
  cancelledAt?: string | null;
  refundedAt?: string | null;

  // Refund tracking
  razorpayRefundId?: string | null;
}

/** Returns the amount actually paid. Use booking.paidAmount if available (preferred). */
export function getPaidAmount(booking: BookingDto): number {
  return booking.paidAmount ?? (
    (booking.discountAmount ?? 0) > 0 && booking.finalAmount != null
      ? booking.finalAmount
      : booking.totalAmount
  );
}

export const getMyBookings = async (): Promise<BookingDto[]> => {
  const response = await api.get('/bookings/my-bookings');
  return response.data;
};

export const cancelBooking = async (
  bookingId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/bookings/${bookingId}/cancel`);
  return response.data;
};
