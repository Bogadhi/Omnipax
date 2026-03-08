import { api as axios } from '@/lib/api';

// This interface mirrors what the UI needs — flat fields.
// The backend returns seatAvailability with a nested `seat` sub-object.
// We flatten it in getSeats() below.
export interface Seat {
  id: string;           // seatAvailability.id
  seatId: string;       // seatAvailability.seatId (the Seat table UUID)
  row: string;          // seatAvailability.seat.row   e.g. "A"
  number: number;       // seatAvailability.seat.number e.g. 3
  status: 'AVAILABLE' | 'LOCKED' | 'BOOKED';
  lockedBy?: string | null;
  lockedUntil?: string | null;
  price: number;
}

export const seatsApi = {
  getSeats: async (showId: string): Promise<Seat[]> => {
    const { data } = await axios.get(`/shows/${showId}/seats`);
    // Backend returns SeatAvailability[] each with a nested `.seat` object.
    // Flatten so that `seat.row` and `seat.number` are directly accessible.
    const raw: any[] = Array.isArray(data) ? data : (data?.data ?? []);
    return raw.map((avail: any) => ({
      id:          avail.id,
      seatId:      avail.seatId,
      row:         avail.seat?.row    ?? avail.row    ?? '',
      number:      avail.seat?.number ?? avail.number ?? 0,
      status:      avail.status ?? 'AVAILABLE',
      lockedBy:    avail.userId ?? null,
      lockedUntil: avail.lockedUntil ?? null,
      price:       avail.price ?? 0,
    }));
  },

  lockSeats: async (showId: string, seatNumbers: string[]): Promise<{ success: boolean; bookingId: string; amount: number }> => {
    const { data } = await axios.post(`/bookings/lock`, { 
      showId, 
      seatNumbers,
      idempotencyKey: crypto.randomUUID()
    });
    return data;
  },

  lockGeneralAdmission: async (showId: string, qty: number): Promise<{ success: boolean; bookingId: string; amount: number }> => {
    const { data } = await axios.post(`/bookings/lock-ga`, { showId, qty });
    return data;
  },

  confirmBooking: async (
    paymentDetails: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }
  ): Promise<any> => {
    const { data } = await axios.post(`/bookings/confirm`, paymentDetails);
    return data;
  },

  calculatePricing: async (showId: string, qty: number, price?: number): Promise<{ baseAmount: number; convenienceFee: number; serviceFee: number; totalAmount: number; breakdown: any }> => {
    const { data } = await axios.get(`/pricing/${showId}/calculate`, {
      params: { qty, price },
    });
    return data;
  },
};
