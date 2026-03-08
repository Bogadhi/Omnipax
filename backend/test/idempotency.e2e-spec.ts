import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase, prisma } from './utils/clean-db';
import { createTestApp } from './utils/create-test-app';
import { loginUser } from './utils/auth-helper';
import { v4 as uuidv4 } from 'uuid';
import { BookingService } from '../src/booking/booking.service';

describe('Idempotency (E2E)', () => {
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
    authToken = await loginUser(app, 'idem@test.com');

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'starpass' } });

    const theater = await prisma.theater.create({
      data: {
        name: 'Idempotency Rex',
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
        title: 'Idempotency Event',
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

    const seat = await prisma.seat.create({
      data: {
        screenId: screen.id,
        row: 'A',
        number: 1,
        tenantId: tenant!.id,
      },
    });

    const show = await bookingService.createShow({
      eventId: event.id,
      screenId: screen.id,
      startTime: new Date(Date.now() + 86400000).toISOString(),
      price: 10,
      tenantId: tenant!.id,
    } as any);
    
    await prisma.seatAvailability.create({
      data: {
        showId: show.id,
        seatId: seat.id,
        status: 'AVAILABLE',
        tenantId: tenant!.id,
      }
    });

    showId = show.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('should return cached response for duplicate request', async () => {
    const idempotencyKey = uuidv4();
    const payload = { seatIds: ['A-1'] }; // Need seat ID format expected, usually UUID but maybe row-number? wait, getSeats returns IDs. Let's fetch seats.
    
    const actualPayload = { seatIds: ['A1'] };

    // 1st Request
    const res1 = await request(app.getHttpServer())
      .post(`/shows/${showId}/lock-seats`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-slug', 'starpass')
      .set('Idempotency-Key', idempotencyKey)
      .send(actualPayload);

    console.log('RES1 STATUS:', res1.status, 'BODY:', res1.body);
    expect(res1.status).toBe(201);

    // Provide a short delay for RxJS tap to finish asynchronous cache setting
    await new Promise(r => setTimeout(r, 100));

    // 2nd Request (Duplicate)
    const res2 = await request(app.getHttpServer())
      .post(`/shows/${showId}/lock-seats`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-slug', 'starpass')
      .set('Idempotency-Key', idempotencyKey) // SAME KEY
      .send(actualPayload);

    // If idempotency works, it returns the CACHED 201 response.
    // If it fails (interceptor bypassed), it hits service -> Redis Lock Check -> 400 Bad Request
    expect(res2.status).toBe(201);
    expect(res2.body).toEqual(res1.body); // Same response body

    // DB Integrity check
    const bookingsCount = await prisma.booking.count();
    expect(bookingsCount).toBe(1); // Only 1 created
  });
});
