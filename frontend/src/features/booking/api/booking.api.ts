import { api } from '@/lib/api';
import { CreateBookingPayload, BookingResponse, PaymentVerificationPayload, Booking } from '../types';

export const bookingApi = {
  createBooking: async (payload: { showId: string; seatNumbers: string[]; idempotencyKey: string }): Promise<BookingResponse> => {
    const response = await api.post<BookingResponse>('/bookings/lock', payload, {
      headers: {
        'Idempotency-Key': payload.idempotencyKey,
      },
    });
    return response.data;
  },

  verifyPayment: async (payload: PaymentVerificationPayload): Promise<Booking> => {
    const response = await api.post<Booking>('/bookings/confirm', payload);
    return response.data;
  },

  getBookingById: async (id: string): Promise<Booking> => {
    const response = await api.get<Booking>(`/bookings/${id}`);
    return response.data;
  },
};
