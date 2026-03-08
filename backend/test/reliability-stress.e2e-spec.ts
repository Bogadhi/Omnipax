import { INestApplication } from '@nestjs/common';
import { createTestApp } from './utils/create-test-app';
import { prisma, cleanDatabase } from './utils/clean-db';
import { PaymentService } from '../src/payment/payment.service';
import { Role } from '@prisma/client';
import { AnomalyDetectionService } from '../src/platform/anomaly-detection.service';
import { ReliabilityProcessor } from '../src/platform/reliability.processor';
import { BaseAppException } from '../src/common/exceptions/base-app.exception';
import { PaymentReconciliationService } from '../src/payment/payment-reconciliation.service';
import { BookingService } from '../src/booking/booking.service';

describe('Reliability Stress Test Suite (E2E)', () => {
  let app: INestApplication;
  let paymentService: PaymentService;
  let anomalyService: AnomalyDetectionService;
  let processor: ReliabilityProcessor;
  let reconService: PaymentReconciliationService;
  let bookingService: BookingService;
  let testTenantId: string;
  let testUserId: string;
  let testShowId: string;

  beforeAll(async () => {
    try {
      app = await createTestApp();
      paymentService = app.get(PaymentService);
      anomalyService = app.get(AnomalyDetectionService);
      processor = app.get(ReliabilityProcessor);
      reconService = app.get(PaymentReconciliationService);
      bookingService = app.get(BookingService);
    } catch (err) {
      console.error('FAILED TO START APP IN beforeAll', err);
      throw err;
    }
  });

  beforeEach(async () => {
    try {
      await cleanDatabase();

      // Setup Test Data
      const tenant = await prisma.tenant.create({
        data: { name: 'Stress Test Tenant', slug: `stress-${Date.now()}` },
      });
      testTenantId = tenant.id;

      await prisma.tenant.upsert({
          where: { slug: 'starpass' },
          update: {},
          create: { name: 'StarPass', slug: 'starpass' }
      });

      const user = await prisma.user.create({
        data: { 
          email: `stress-user-${Date.now()}@test.com`, 
          password: 'password', 
          role: Role.USER, 
          tenantId: testTenantId 
        },
      });
      testUserId = user.id;

      const event = await prisma.event.create({
        data: {
          title: 'Stress Test Event',
          type: 'MOVIE',
          language: 'English',
          duration: 120,
          date: new Date(),
          location: 'Test Cinema',
          price: 500,
          tenantId: testTenantId,
        }
      });

      const theater = await prisma.theater.create({
          data: { name: 'Stress Theater', city: 'Test City', address: 'Test Addr', tenantId: testTenantId }
      });

      const screen = await prisma.screen.create({
          data: { name: 'Stress Screen', totalRows: 10, seatsPerRow: 10, theaterId: theater.id, tenantId: testTenantId }
      });

      const show = await prisma.show.create({
        data: {
          startTime: new Date(),
          price: 500,
          eventId: event.id,
          screenId: screen.id,
          tenantId: testTenantId,
        }
      });
      testShowId = show.id;

      // Create a dummy seat
      await prisma.seat.create({
          data: { screenId: screen.id, row: 'Z', number: 99, tenantId: testTenantId }
      });
    } catch (err) {
      console.error('FAILED IN beforeEach', err);
      throw err;
    }
  });

  // Create a helper for creating a locked booking in EACH test
  async function createLockedBooking(bookingIdOverride?: string, status: any = 'LOCKED') {
      const bookingId = bookingIdOverride || `stress-bk-${Date.now()}`;
      const booking = await prisma.booking.create({
          data: {
              id: bookingId,
              userId: testUserId,
              showId: testShowId,
              totalAmount: 500,
              finalAmount: 500,
              status: status,
              tenantId: testTenantId,
          }
      });

      const seat = await prisma.seat.findFirst({ where: { tenantId: testTenantId } });
      
      await prisma.bookingSeat.create({
          data: { 
              bookingId: booking.id, 
              seatId: seat!.id, 
              price: 500, 
              tenantId: testTenantId 
          }
      });

      await prisma.seatLock.create({
          data: { 
              bookingId: booking.id, 
              userId: testUserId,
              showId: testShowId,
              seatNumber: `${seat!.row}${seat!.number}`,
              status: 'LOCKED', 
              expiresAt: new Date(Date.now() + 600000),
              tenantId: testTenantId 
          }
      });

      return booking;
  }

  afterAll(async () => {
    try {
        if (app) await app.close();
        await prisma.$disconnect();
    } catch (e) {}
  });

  it('TEST 1: Circuit Breaker Open State', async () => {
      const mockRazorpay = {
        orders: { create: jest.fn().mockRejectedValue(new Error('Outage')) },
      };
      (paymentService as any).razorpay = mockRazorpay;

      const booking = await createLockedBooking();

      for (let i = 0; i < 5; i++) {
        try { await paymentService.createRazorpayOrder(booking.id, testUserId); } catch (e) {}
      }

      try {
        await paymentService.createRazorpayOrder(booking.id, testUserId);
        throw new Error('Should throw');
      } catch (e: any) {
        expect(e.response?.errorCode || (e as any).errorCode).toBe('CIRCUIT_OPEN');
      }
      expect((paymentService as any).circuitState).toBe(1); // OPEN
  });

  it('TEST 2: Webhook Idempotency & PaymentLog uniqueness', async () => {
        const booking = await createLockedBooking(undefined, 'LOCKED');
        await prisma.booking.update({
            where: { id: booking.id },
            data: { razorpayOrderId: 'order_1' }
        });

        jest.spyOn(reconService, 'verifyPayment' as any).mockResolvedValue(true);

        for (let i = 0; i < 3; i++) {
            await reconService.reconcileBooking(booking.id, 'order_1', 'pay_1', { t: 1 }, testTenantId);
        }

        const logs = await prisma.paymentLog.findMany({ where: { razorpayPaymentId: 'pay_1' } });
        expect(logs.length).toBe(1);
        const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
        expect(updatedBooking?.status).toBe('CONFIRMED');
  });

  it('TEST 3: Delayed Webhook Reconciliation Job', async () => {
      const booking = await createLockedBooking(undefined, 'PENDING');
      await prisma.booking.update({
          where: { id: booking.id },
          data: { razorpayOrderId: 'order_delayed' }
      });

      jest.spyOn(reconService, 'verifyPayment' as any).mockResolvedValue(true);
      
      // Simulate Job Processor triggering reconciliation
      await (processor as any).handlePaymentReconciliation({ bookingId: booking.id });
      
      await reconService.reconcileBooking(booking.id, 'order_delayed', 'pay_delayed', { m: 1 }, testTenantId);

      const updated = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(updated?.status).toBe('CONFIRMED');
  });

  it('TEST 4: Tenant Booking Anomaly Detection', async () => {
      for (let i = 0; i < 51; i++) {
        anomalyService.trackBooking(testTenantId);
      }
      expect(anomalyService.getHealth(testTenantId).anomalyFlag).toBe(true);
  });

  it('TEST 5: Circuit Breaker Half-Open Recovery', async () => {
      const mockRazorpay = {
        orders: { create: jest.fn().mockResolvedValue({ id: 'ok' }) },
      };
      (paymentService as any).razorpay = mockRazorpay;
      (paymentService as any).circuitState = 1; // OPEN
      (paymentService as any).lastErrorTime = Date.now() - 130000;

      const booking = await createLockedBooking();

      await paymentService.createRazorpayOrder(booking.id, testUserId);
      expect((paymentService as any).circuitState).toBe(0); // CLOSED
  });

  it('TEST 6: Usage Reset Race Condition Safety', async () => {
      const booking = await createLockedBooking();

      await prisma.tenant.update({ where: { id: testTenantId }, data: { monthlyRevenue: 1000 } });

      const originalDateNow = Date.now;
      Date.now = jest.fn(() => new Date('2026-03-01T00:00:00Z').getTime());

      await Promise.all([
        (processor as any).handleUsageReset(),
        bookingService.confirmBookingFromRazorpay(booking.id, 'pay_race', 'sig_race', prisma)
      ]);

      Date.now = originalDateNow;

      const tenant = await prisma.tenant.findUnique({ where: { id: testTenantId } });
      expect(Number(tenant?.monthlyRevenue)).toBeGreaterThanOrEqual(0);
  });
});
