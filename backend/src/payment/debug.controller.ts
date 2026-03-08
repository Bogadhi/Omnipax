import { Controller, Post, Body, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventService } from '../event/event.service';

@Controller('debug')
export class DebugController {
  constructor(private eventService: EventService) {}

  @Get('ping')
  getPing() {
    return 'pong';
  }

  @Get('config')
  getConfig() {
    return {
      databaseUrl: process.env.DATABASE_URL,
      paymentProvider: process.env.PAYMENT_PROVIDER,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      nodeEnv: process.env.NODE_ENV,
      cwd: process.cwd(),
    };
  }

  @Post('log')
  log(@Body() body: any) {
    const { type, args } = body;
    const timestamp = new Date().toISOString();
    console.log(`[BROWSER ${type.toUpperCase()} ${timestamp}]`, ...args);
    return { ok: true };
  }

  @Post('ensure-availability')
  async ensureAvailability() {
    return this.eventService.ensureTestEventAvailability();
  }
}
