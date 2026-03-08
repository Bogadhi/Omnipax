import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '../interfaces/payment-provider.interface';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(RazorpayPaymentProvider.name);
  private razorpayInstance: Razorpay;
  private keySecret: string;

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    this.keySecret =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';

    if (!keyId || !this.keySecret) {
      this.logger.error('Razorpay keys not found in configuration');
      throw new InternalServerErrorException('Razorpay configuration missing');
    }

    this.razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: this.keySecret,
    });
    this.logger.log('RazorpayPaymentProvider initialized');
  }

  async createOrder(
    amount: number,
    currency: string,
    receipt: string,
  ): Promise<{ orderId: string }> {
    try {
      const options = {
        amount: Math.round(amount * 100), // Razorpay expects amount in paise
        currency,
        receipt,
      };
      const order = await this.razorpayInstance.orders.create(options);
      this.logger.log(`Razorpay order created: ${order.id}`);
      return { orderId: order.id };
    } catch (error: any) {
      this.logger.error(`Failed to create Razorpay order: ${error.message}`);
      throw new InternalServerErrorException('Payment processing failed');
    }
  }

  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    try {
      const generatedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(orderId + '|' + paymentId)
        .digest('hex');

      if (generatedSignature !== signature) {
        this.logger.warn(`Invalid signature for payment: ${paymentId}`);
        return false;
      }

      this.logger.log(`Payment verified successfully: ${paymentId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }
}
