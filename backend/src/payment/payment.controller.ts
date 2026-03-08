import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
  Req,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Body('bookingId') bookingId: string, @Request() req: any) {
    console.log('--- PaymentController.createOrder Entry ---');
    console.log('BookingId:', bookingId);
    console.log('UserId:', req.user.id);
    if (!bookingId) {
      throw new BadRequestException('Booking ID is required');
    }
    return this.paymentService.createRazorpayOrder(bookingId, req.user.id);
  }

  /**
   * Razorpay Webhook
   *
   * Raw body is captured via the bodyParser.json verify callback in main.ts
   * and stored as req.rawBody (string). req.body is already parsed JSON.
   *
   * Must return 200 quickly — heavy work is done inside PaymentService.
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody: string | undefined = req.rawBody;

    if (!rawBody) {
      console.error('❌ Webhook: rawBody is missing from request');
      throw new BadRequestException('Raw body missing');
    }

    if (!signature) {
      console.error('❌ Webhook: x-razorpay-signature header missing');
      throw new BadRequestException('Missing Razorpay signature');
    }

    return this.paymentService.handleWebhook(rawBody, signature);
  }
}
