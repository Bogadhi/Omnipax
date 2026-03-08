import { api as axios } from '@/lib/api';

export interface DiscountBreakdown {
  totalAmount: number;
  couponDiscountAmount: number;
  giftCardDiscountAmount: number;
  discountAmount: number;
  finalAmount: number;
}

export const paymentApi = {
  createOrder: async (bookingId: string): Promise<{ orderId: string, amount: number, currency: string, keyId: string }> => {
    const { data } = await axios.post('/payments/create-order', {
      bookingId,
    });
    return data;
  },

  confirmPayment: async (params: {
    bookingId: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  }): Promise<{ id: string; status: string }> => {
    const { data } = await axios.post('/bookings/confirm', params);
    return data;
  },

  applyDiscount: async (params: {
    bookingId: string;
    couponCode?: string;
    giftCardCode?: string;
  }): Promise<DiscountBreakdown> => {
    const { data } = await axios.post('/discounts/apply', params);
    return data;
  },
};
