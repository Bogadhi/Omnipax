export interface PaymentProvider {
  createOrder(
    amount: number,
    currency: string,
    receipt: string,
  ): Promise<{ orderId: string }>;

  verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean>;
}
