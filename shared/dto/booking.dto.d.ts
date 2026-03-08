export declare class LockSeatsDto {
    seatIds: string[];
}
export declare class ConfirmBookingDto {
    bookingId: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
}
export interface CreateBookingPayload {
    eventId: string;
    seats: number[];
    idempotencyKey?: string;
}
export interface BookingResponse {
    bookingId: string;
    status: string;
    orderId: string;
    amount: number;
    currency: string;
}
export interface PaymentVerificationPayload {
    bookingId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}
export declare enum BookingStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    CANCELLED = "CANCELLED",
    FAILED = "FAILED"
}
export interface BookingDto {
    id: string;
    eventId: string;
    userId: string;
    seats: number[];
    status: BookingStatus;
    totalAmount: number;
    discountAmount?: number;
    finalAmount?: number;
    couponCode?: string | null;
    giftCardCode?: string | null;
    createdAt: string;
}
