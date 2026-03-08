import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase, prisma } from './utils/clean-db';
import { createTestApp } from './utils/create-test-app';
import { loginUser } from './utils/auth-helper';
import { v4 as uuidv4 } from 'uuid';
import { BookingService } from '../src/booking/booking.service';
import { Role, PlatformFeeType } from '@prisma/client';

describe('Monetization Layer (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let tenantId: string;
  let showId: string;
  let bookingService: BookingService;

  beforeAll(async () => {
    app = await createTestApp();
    bookingService = app.get(BookingService);
  });

  beforeEach(async () => {
    await cleanDatabase();

    // 1. Setup Tenant
    let tenant = await prisma.tenant.findUnique({ where: { slug: 'starpass' } });
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'StarPass',
                slug: 'starpass',
                isActive: true
            }
        });
    }
    tenantId = tenant!.id;

    // 2. Setup Identities
    // Create admin user first to ensure loginUser finds it with SUPER_ADMIN role
    const adminEmail = 'admin@starpass.com';
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: Role.SUPER_ADMIN },
      create: {
        email: adminEmail,
        name: 'Admin',
        role: Role.SUPER_ADMIN,
        password: 'hashed_password',
        tenant: { connect: { id: tenantId } },
      },
    });
    adminToken = await loginUser(app, adminEmail);

    userToken = await loginUser(app, 'buyer@test.com');

    // 3. Setup Show
    const theater = await prisma.theater.create({
      data: {
        name: 'Grand Rex',
        city: 'Paris',
        address: '1 Bd Poissonniere',
        tenantId,
        screens: { create: [{ name: 'Screen 1', totalRows: 10, seatsPerRow: 10, tenantId }] },
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
        price: 100, // Price per seat
        totalSeats: 100,
        availableSeats: 100,
        type: 'CONCERT',
        language: 'English',
        duration: 120,
        tenantId,
      },
    });

    const seat = await prisma.seat.create({
      data: { screenId: screen.id, row: 'A', number: 1, tenantId },
    });

    const show = await bookingService.createShow({
      eventId: event.id,
      screenId: screen.id,
      startTime: new Date(Date.now() + 86400000).toISOString(),
      price: 100,
      tenantId,
    } as any);

    await prisma.seatAvailability.create({
      data: { showId: show.id, seatId: seat.id, status: 'AVAILABLE', tenantId },
    });

    showId = show.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('should apply percentage fee correctly (2%)', async () => {
    const setupRes = await request(app.getHttpServer())
      .patch(`/tenants/${tenantId}/monetization`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-slug', 'starpass')
      .send({ enabled: true, type: PlatformFeeType.PERCENTAGE, value: 2 });

    if (setupRes.status !== 200) {
      console.error('FAILED TO SET MONETIZATION:', setupRes.body);
    }
    expect(setupRes.status).toBe(200);

    // 2. Lock Seat
    const res = await request(app.getHttpServer())
      .post(`/shows/${showId}/lock-seats`)
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-tenant-slug', 'starpass')
      .send({ seatIds: ['A1'] })
      .expect(201);

    const bookingId = res.body.bookingId;

    // 3. Verify Breakdown
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    // ticket: 100, fee: 2% of 100 = 2, total: 102
    expect(Number(booking?.ticketAmount)).toBe(100);
    expect(Number(booking?.platformFeeAmount)).toBe(2);
    expect(Number(booking?.totalAmount)).toBe(102);

    // 4. Create Order
    const orderRes = await request(app.getHttpServer())
      .post('/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-tenant-slug', 'starpass')
      .send({ bookingId })
      .expect(201);

    expect(orderRes.body.amount).toBe(10200); // 102 * 100 paise
  });

  it('should apply flat fee correctly (₹50)', async () => {
    // 1. Set ₹50 flat fee
    await request(app.getHttpServer())
      .patch(`/tenants/${tenantId}/monetization`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-slug', 'starpass')
      .send({ enabled: true, type: PlatformFeeType.FLAT, value: 50 })
      .expect(200);

    // 2. Lock Seat
    const res = await request(app.getHttpServer())
      .post(`/shows/${showId}/lock-seats`)
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-tenant-slug', 'starpass')
      .send({ seatIds: ['A1'] })
      .expect(201);

    const bookingId = res.body.bookingId;

    // 3. Verify Breakdown
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    // ticket: 100, fee: 50, total: 150
    expect(Number(booking?.ticketAmount)).toBe(100);
    expect(Number(booking?.platformFeeAmount)).toBe(50);
    expect(Number(booking?.totalAmount)).toBe(150);
  });

  it('should aggregate settlement analytics correctly', async () => {
    // 1. Set 10% fee
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { platformFeeEnabled: true, platformFeeType: PlatformFeeType.PERCENTAGE, platformFeeValue: 10 }
    });

    const user = await prisma.user.findFirst({ where: { email: 'buyer@test.com' } });

    // 2. Create a confirmed booking
    await prisma.booking.create({
      data: {
        userId: user!.id,
        showId,
        tenantId,
        ticketAmount: 100,
        platformFeeAmount: 10,
        totalAmount: 110,
        theaterNetAmount: 100,
        status: 'CONFIRMED',
      }
    });

    // 3. Create a cancelled booking (should be ignored)
    await prisma.booking.create({
      data: {
        userId: user!.id,
        showId,
        tenantId,
        ticketAmount: 100,
        platformFeeAmount: 10,
        totalAmount: 110,
        theaterNetAmount: 100,
        status: 'CANCELLED',
      }
    });

    // 4. Fetch Settlement
    const res = await request(app.getHttpServer())
      .get(`/analytics/settlement?tenantId=${tenantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-slug', 'starpass')
      .expect(200);

    expect(res.body.confirmedBookings).toBe(1);
    expect(Number(res.body.grossRevenue)).toBe(110);
    expect(Number(res.body.platformFees)).toBe(10);
    expect(Number(res.body.theaterNetPayable)).toBe(100);
  });
});
