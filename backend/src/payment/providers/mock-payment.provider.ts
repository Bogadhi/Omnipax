import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider } from '../interfaces/payment-provider.interface';
import * as crypto from 'crypto';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);

  constructor() {
    this.logger.log('Using MockPaymentProvider');
  }

  async createOrder(
    amount: number,
    currency: string,
    receipt: string,
  ): Promise<{ orderId: string }> {
    const orderId = `mock_${crypto.randomUUID()}`;
    this.logger.log(
      `Created mock order: ${orderId} for amount: ${amount} ${currency}`,
    );
    return { orderId };
  }

  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    this.logger.log(
      `Verifying mock payment: ${paymentId} for order: ${orderId}`,
    );
    // In mock mode, we always accept the payment if the signature indicates success
    // Or just return true for simplicity as per requirements
    return true;
  }
}
