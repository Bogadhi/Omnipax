import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BookingStatus, PlatformFeeType, Prisma } from '@prisma/client';

describe('Monetization Hardening (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let userId: string;
  let adminToken: string;
  let showId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup Test Data
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'hardening-test-theater',
        name: 'Hardening Test Theater',
        platformFeeType: PlatformFeeType.PERCENTAGE,
        platformFeeValue: 10,
      },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test Admin',
        role: 'SUPER_ADMIN',
      },
    });
    userId = user.id;

    // Simulate login for token (Mocking auth for simplicity in this hardened test)
    // In a real scenario, we'd use the AuthService
    adminToken = 'MOCK_SUPER_ADMIN_TOKEN'; // We might need a real JWT if guards are strict
    
    const event = await prisma.event.create({
        data: {
            title: 'Monetization Test Event',
            description: 'Testing snapshots',
            type: 'MOVIE',
            language: 'English',
            duration: 120,
            date: new Date(),
            location: 'Main Hall',
            price: 500,
            tenantId,
        }
    });

    const theater = await prisma.theater.create({
        data: { name: 'Test Hall', city: 'Lab', address: '123 Test St', tenantId }
    });

    const screen = await prisma.screen.create({
        data: { name: 'Screen 1', totalRows: 10, seatsPerRow: 10, theaterId: theater.id }
    });

    const show = await prisma.show.create({
      data: {
        eventId: event.id,
        screenId: screen.id,
        startTime: new Date(Date.now() + 86400000),
        price: 500,
        totalCapacity: 100,
      },
    });
    showId = show.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.bookingSeat.deleteMany({ where: { booking: { tenantId } } });
    await prisma.seatLock.deleteMany({ where: { tenantId } });
    await prisma.booking.deleteMany({ where: { tenantId } });
    await prisma.monetizationAudit.deleteMany({ where: { tenantId } });
    await prisma.show.deleteMany({ where: { id: showId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('should preserve monetization settings in a snapshot after seat lock', async () => {
    // 1. Initial state (10% set in beforeAll)
    
    // 2. Lock seats
    const lockResponse = await request(app.getHttpServer())
      .post('/seat-lock/lock')
      .send({
        showId,
        seatIds: ['A1', 'A2'],
        userId,
        tenantId,
      });

    expect(lockResponse.status).toBe(201);
    const bookingId = lockResponse.body.bookingId;

    // 3. Change fee to 20%
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { platformFeeValue: 20 },
    });
    
    // Workaround for Decimal check in tests
    const prismaBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!prismaBooking) throw new Error('Booking not found');

    expect(Number(prismaBooking.platformFeePercentageSnapshot)).toBe(10);
    expect(prismaBooking.platformFeeTypeSnapshot).toBe(PlatformFeeType.PERCENTAGE);
  });

  it('should enforce Model A refund policy (retain platform fee)', async () => {
    // 1. Create a confirmed booking
    // Note: Manual injection to bypass payment gateway mock complexity
    const booking = await prisma.booking.create({
        data: {
            showId,
            userId,
            tenantId,
            status: BookingStatus.CONFIRMED,
            ticketAmount: 1000,
            platformFeeAmount: 100,
            totalAmount: 1100,
            finalAmount: 1100,
            platformFeeTypeSnapshot: PlatformFeeType.PERCENTAGE,
            platformFeePercentageSnapshot: 10,
        }
    });

    // 2. Initiate partial refund (1 seat)
    // We expect 500 ticket amount to be refunded. 50 platform fee stays.
    // Wait, Model A says platform fee is RETAINED on refund.
    // If we refund 1 seat out of 2: ticketAmount 500 refunded. platformFeeAmount stays at 100 for platform.
    
    const refundRes = await request(app.getHttpServer())
        .post(`/payment/refund/${booking.id}`)
        .send({ tenantId, seatsToRefund: 1 });

    expect(refundRes.status).toBe(201);

    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id }});
    expect(Number(updatedBooking.refundAmount)).toBe(500);
    expect(updatedBooking.refundedSeatsCount).toBe(1);
    expect(Number(updatedBooking.platformFeeAmount)).toBe(100); // Unchanged
  });

  it('should prevent double-refund exploits via the guard condition', async () => {
    const booking = await prisma.booking.create({
        data: {
            showId,
            userId,
            tenantId,
            status: BookingStatus.CONFIRMED,
            ticketAmount: 1000,
            platformFeeAmount: 100,
            totalAmount: 1100,
            finalAmount: 1100,
            seatsCount: 2,
        }
    });

    // Refund 2 seats
    await request(app.getHttpServer())
        .post(`/payment/refund/${booking.id}`)
        .send({ tenantId, seatsToRefund: 2 });

    // Attempt to refund another
    const failRes = await request(app.getHttpServer())
        .post(`/payment/refund/${booking.id}`)
        .send({ tenantId, seatsToRefund: 1 });

    expect(failRes.status).toBe(400);
    expect(failRes.body.message).toContain('Exceeds refundable');
  });

  it('should enforce hard caps (20% and ₹1000) on monetization updates', async () => {
    // Attempt to set 25% fee
    const capRes1 = await request(app.getHttpServer())
        .post(`/admin/tenants/${tenantId}/monetization`)
        .set('x-user-id', userId) // Bypass actual JWT for this logic test if guard allows or is mocked
        .send({
            platformFeeType: PlatformFeeType.PERCENTAGE,
            platformFeePercentage: 25,
        });

    expect(capRes1.status).toBe(400);

    // Attempt to set ₹1500 flat fee
    const capRes2 = await request(app.getHttpServer())
        .post(`/admin/tenants/${tenantId}/monetization`)
        .set('x-user-id', userId)
        .send({
            platformFeeType: PlatformFeeType.FLAT,
            platformFlatFee: 1500,
        });

    expect(capRes2.status).toBe(400);
  });

  it('should generate audit logs for every monetization change', async () => {
    const oldSettings = await prisma.tenant.findUnique({ where: { id: tenantId }});
    
    const changeRes = await request(app.getHttpServer())
        .post(`/admin/tenants/${tenantId}/monetization`)
        .set('x-user-id', userId)
        .send({
            platformFeeType: PlatformFeeType.FLAT,
            platformFlatFee: 50,
        });

    expect(changeRes.status).toBe(201);

    const audits = await prisma.monetizationAudit.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 1,
    });

    expect(audits.length).toBe(1);
    expect(audits[0].newFlatFee.toNumber()).toBe(50);
    expect(audits[0].oldPercentage.toNumber()).toBe(Number(oldSettings.platformFeeValue));
    expect(audits[0].changedByUserId).toBe(userId);
  });
});
