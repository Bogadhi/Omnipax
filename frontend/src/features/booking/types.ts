import { BookingDto, BookingStatus, CreateBookingPayload as SharedCreateBookingPayload, BookingResponse as SharedBookingResponse, PaymentVerificationPayload as SharedPaymentVerificationPayload } from '@shared';

export interface Seat {
  id: number; // Seat number/ID
  status: 'available' | 'booked' | 'selected';
}

export type CreateBookingPayload = SharedCreateBookingPayload;

export type BookingResponse = SharedBookingResponse;

export type PaymentVerificationPayload = SharedPaymentVerificationPayload;

export type Booking = BookingDto & {
  createdAt: string;
};

// Global Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}
