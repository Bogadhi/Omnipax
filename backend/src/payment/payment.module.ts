import { Module, forwardRef } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentWebhookController } from './payment.webhook.controller';
import { BookingModule } from '../booking/booking.module';
import { EventModule } from '../event/event.module';
import { PricingModule } from '../pricing/pricing.module';
import { RazorpayPaymentProvider } from './providers/razorpay-payment.provider';
import { DebugController } from './debug.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentProcessorService } from './payment-processor.service';
import { RefundService } from './refund.service';
import { ReconciliationWorker } from './reconciliation.worker';
import { TicketsModule } from '../tickets/tickets.module';
import { PaymentReconciliationService } from './payment-reconciliation.service';

@Module({
  imports: [
    forwardRef(() => BookingModule), 
    EventModule, 
    PricingModule, 
    PrismaModule,
    TicketsModule,
    // ✅ DO NOT add ScheduleModule.forRoot() here.
    // It is already registered globally in AppModule.
    // Registering it a second time creates a second scheduler instance,
    // causing every @Cron() to fire TWICE and doubling memory usage.
  ],

  providers: [
    PaymentService,
    PaymentProcessorService,
    RefundService,
    ReconciliationWorker,
    PaymentReconciliationService,
    {
      provide: 'PAYMENT_PROVIDER',
      useClass: RazorpayPaymentProvider,
    },
  ],
  controllers: [PaymentController, PaymentWebhookController, DebugController],
  exports: [PaymentService, 'PAYMENT_PROVIDER', PaymentProcessorService, RefundService, PaymentReconciliationService],
})
export class PaymentModule {}
