import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase, prisma } from './utils/clean-db';
import { createTestApp } from './utils/create-test-app';
import { loginUser } from './utils/auth-helper';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { BookingService } from '../src/booking/booking.service';

describe('Booking Integrity (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let showId: string;
  let bookingService: BookingService;

  beforeAll(async () => {
    app = await createTestApp();
    bookingService = app.get(BookingService);
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Auth & Setup
    authToken = await loginUser(app, 'buyer@test.com');

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'starpass' } });

    const theater = await prisma.theater.create({
      data: {
        name: 'Grand Rex',
        city: 'Paris',
        address: '1 Bd Poissonniere',
        tenantId: tenant!.id,
        screens: { create: [{ name: 'Screen 1', totalRows: 10, seatsPerRow: 10, tenantId: tenant!.id }] },
      },
      include: { screens: true },
    }) as any;
    const screen = theater.screens[0];

    const event = await prisma.event.create({
      data: {
        title: 'Test Concert',
        description: 'Test',
        date: new Date(Date.now() + 86400000),
        location: 'Space',
        price: 10,
        totalSeats: 100,
        availableSeats: 100,
        type: 'CONCERT',
        language: 'English',
        duration: 120,
        tenantId: tenant!.id,
      },
    });

    const seat1 = await prisma.seat.create({
      data: { screenId: screen.id, row: 'A', number: 1, tenantId: tenant!.id },
    });
    const seat2 = await prisma.seat.create({
      data: { screenId: screen.id, row: 'A', number: 2, tenantId: tenant!.id },
    });
    const seat3 = await prisma.seat.create({
      data: { screenId: screen.id, row: 'A', number: 3, tenantId: tenant!.id },
    });

    const show = await bookingService.createShow({
      eventId: event.id,
      screenId: screen.id,
      startTime: new Date(Date.now() + 86400000).toISOString(),
      price: 10,
      tenantId: tenant!.id,
    } as any);
    
    await prisma.seatAvailability.createMany({
      data: [
        { showId: show.id, seatId: seat1.id, status: 'AVAILABLE', tenantId: tenant!.id },
        { showId: show.id, seatId: seat2.id, status: 'AVAILABLE', tenantId: tenant!.id },
        { showId: show.id, seatId: seat3.id, status: 'AVAILABLE', tenantId: tenant!.id },
      ]
    });

    showId = show.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('should successfully lock, create order, and confirm a booking', async () => {
    const seatId = 'A1';

    // 1. Lock Seat
    const lockRes = await request(app.getHttpServer())
      .post(`/shows/${showId}/lock-seats`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-slug', 'starpass')
      .send({ seatIds: [seatId] });

    expect(lockRes.status).toBe(201);
    const bookingId = lockRes.body.bookingId || lockRes.body.id;
    expect(bookingId).toBeDefined();

    // Verify DB state (Locked)
    const lockedBooking = await prisma.booking.findFirst({
      where: { id: bookingId },
    });
    expect(lockedBooking).toBeDefined();
    expect(lockedBooking?.status).toBe('LOCKED');

    // 2. Create Order
    const orderRes = await request(app.getHttpServer())
      .post('/payments/create-order')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-slug', 'starpass')
      .send({ bookingId });

    expect(orderRes.status).toBe(201);
    const razorpayOrderId = orderRes.body.orderId;
    expect(razorpayOrderId).toBeDefined();

    const inProgressBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    expect(inProgressBooking?.status).toBe('PAYMENT_IN_PROGRESS');

    // 3. Confirm Booking
    const razorpayPaymentId = 'pay_' + uuidv4().substring(0, 10);
    const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
    const razorpaySignature = crypto.createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const confirmRes = await request(app.getHttpServer())
      .post('/bookings/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-slug', 'starpass')
      .send({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

    expect(confirmRes.status).toBe(201);

    // Verify DB state (Confirmed)
    const confirmedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    expect(confirmedBooking?.status).toBe('CONFIRMED');
    expect(confirmedBooking?.razorpayPaymentId).toBe(razorpayPaymentId);
  });

  it('should fail to lock an already locked seat', async () => {
    const seatId = 'A2';

    // User 1 Locks
    await request(app.getHttpServer())
      .post(`/shows/${showId}/lock-seats`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-slug', 'starpass')
      .send({ seatIds: [seatId] })
      .expect(201);

    // User 2 tries to Lock same seat
    const user2Token = await loginUser(app, 'other@test.com');

    const res = await request(app.getHttpServer())
      .post(`/shows/${showId}/lock-seats`)
      .set('Authorization', `Bearer ${user2Token}`)
      .set('x-tenant-slug', 'starpass')
      .send({ seatIds: [seatId] });

    expect(res.status).toBe(409); // ConflictException
    expect(res.body.message).toContain('already locked');
  });

  it('should fail to create order without locking first', async () => {
    // Attempt order directly with a fake booking
    const fakeId = uuidv4();
    const res = await request(app.getHttpServer())
      .post('/payments/create-order')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-slug', 'starpass')
      .send({ bookingId: fakeId });

    expect([400, 404]).toContain(res.status); // Not Found or Bad Request
  });
});
