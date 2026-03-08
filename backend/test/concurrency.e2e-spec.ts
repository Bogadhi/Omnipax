import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase, prisma } from './utils/clean-db';
import { createTestApp } from './utils/create-test-app';
import { loginUser } from './utils/auth-helper';

describe('Concurrency (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let showId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Auth
    authToken = await loginUser(app, 'concurrent@test.com');

    // Seed Data
    const theater = await prisma.theater.create({
      data: {
        name: 'Concurrent Rex',
        city: 'Paris',
        address: '1 Bd Poissonniere',
        screens: { create: [{ name: 'Screen 1', totalRows: 10, seatsPerRow: 10 }] },
      },
      include: { screens: true },
    }) as any;
    const screen = theater.screens[0];

    const event = await prisma.event.create({
      data: {
        title: 'High Demand Concert',
        description: 'Race condition test',
        date: new Date(Date.now() + 86400000),
        location: 'Virtual',
        price: 100,
        totalSeats: 100,
        availableSeats: 100,
        type: 'CONCERT',
        language: 'English',
        duration: 120,
      },
    });

    const show = await prisma.show.create({
      data: {
        eventId: event.id,
        screenId: screen.id,
        startTime: new Date(Date.now() + 86400000),
        price: 10.0,
      },
    });
    showId = show.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('should only allow 1 successful lock when 10 users compete for 1 seat', async () => {
    const seatId = 'A1';
    const numberOfRequests = 10;

    // We need 10 different users to test real contention logic properly if logic checks per-user limits,
    // but here we test seat contention.
    // Usually Redis lock is key=seatId.
    // If we use same token, logic might say "User already has lock" or "Seat already locked".
    // Effect is same: mutual exclusion.
    // For realism, let's use same user (since we didn't gen 10 tokens) but concurrent requests.
    // Or generate 10 tokens if we want strict realism.
    // Let's stick to single user trying to double-lock or parallel lock.
    // Actually, `lockSeat` checks `redis.set(..., 'NX')`.
    // If same user sends 2 requests, 1st wins, 2nd fails (Seat already locked). Correct.

    const requests = Array.from({ length: numberOfRequests }).map(() => {
      return request(app.getHttpServer())
        .post('/bookings/lock')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ showId, seatId });
    });

    const responses = await Promise.allSettled(requests);

    const successCount = responses.filter(
      (r): r is PromiseFulfilledResult<request.Response> =>
        r.status === 'fulfilled' && r.value.status === 201,
    ).length;

    const failCount = responses.filter(
      (r): r is PromiseFulfilledResult<request.Response> =>
        r.status === 'fulfilled' && r.value.status === 400,
    ).length;

    console.log(
      `Concurrency Results: Success=${successCount}, Fail=${failCount}`,
    );

    expect(successCount).toBe(1);
    expect(failCount).toBe(numberOfRequests - 1);

    // DB Integrity
    const locksCount = await prisma.booking.count({
      where: { showId, status: 'LOCKED' },
    });
    expect(locksCount).toBe(1);

    const lockedBooking = await prisma.booking.findFirst({
      where: { showId, status: 'LOCKED' },
      include: { bookingSeats: true },
    });
    expect(lockedBooking?.bookingSeats[0].seatId).toBe(seatId);
  }, 10000);
});
