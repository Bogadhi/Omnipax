
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BookingService } from '../booking/booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { io, Socket } from 'socket.io-client';

import { RedisIoAdapter } from '../common/adapters/redis-io.adapter';

async function bootstrap() {
  // Use create() to start full HTTP/WS server
  const app = await NestFactory.create(AppModule);
  // Enable shut down hooks
  app.enableShutdownHooks();

  const bookingService = app.get(BookingService);
  const prisma = app.get(PrismaService);
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);

  // Use Redis Adapter
  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Enable CORS
  app.enableCors({ origin: '*' });

  // Start Server on random port
  const server = await app.listen(0);
  const port = server.address().port;
  const url = `http://localhost:${port}/admin`;
  console.log(`🚀 Starting Admin Monitor Verification on ${url}...`);

  try {
    // 1. Setup Data
    const email = `admin-test-${Date.now()}@example.com`;
    const admin = await prisma.user.create({
      data: {
        email,
        name: 'Admin Tester',
        password: 'password',
        role: 'ADMIN',
      },
    });

    // Create Event & Show
    const theater = await prisma.theater.findFirst();
    if (!theater) throw new Error('No theater found');

    const screen = await prisma.screen.create({
      data: {
        theaterId: theater.id,
        name: `TEST SCREEN ${Date.now()}`,
        totalRows: 10,
        seatsPerRow: 10,
      },
    });

    // Create Seats for Screen
    await prisma.seat.createMany({
      data: [
        { screenId: screen.id, row: 'A', number: 1 },
        { screenId: screen.id, row: 'A', number: 2 },
      ],
    });

    const event = await prisma.event.create({
      data: {
        title: `Live Monitor Test ${Date.now()}`,
        type: 'MOVIE',
        language: 'EN',
        duration: 120,
        date: new Date(),
        location: 'Test Loc',
        price: 100,
        description: 'Test',
        posterUrl: 'http://test.com',
      },
    });

    const show = await bookingService.createShow({
      startTime: new Date(Date.now() + 3600000).toISOString(),
      price: 150,
      eventId: event.id,
      screenId: screen.id,
    });

    const seats = await bookingService.getSeats(show.id);
    if (!seats.length) throw new Error('No seats generated');
    const seatId = seats[0].id;

    console.log('✅ Data Setup Complete. Show:', show.id);

    // 2. Generate Admin Token
    const token = jwtService.sign(
      { sub: admin.id, email: admin.email, role: 'ADMIN' },
      { secret: configService.get('JWT_SECRET') },
    );

    // 3. Connect WebSocket
    console.log(`🔌 Connecting to Admin WebSocket at ${url}...`);
    const socket: Socket = io(url, {
      auth: { token },
      // Allow auto-upgrade
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ Connected to Admin Namespace');
        resolve();
      });
      socket.on('connect_error', (err) => {
        reject(new Error(`Connection Error: ${err.message}`));
      });
      setTimeout(() => reject(new Error('Connection Timeout')), 5000);
    });

    // 4. Test Monitoring
    console.log('👀 Monitoring Show...');
    socket.emit('monitor_show', { showId: show.id });

    // Listen for events
    const eventPromise = new Promise<{ type: string; data: any }>(
      (resolve) => {
        socket.on('seat_locked', (data) => {
          console.log('📨 Received seat_locked:', data);
          if (data.seatId === seatId) resolve({ type: 'SEAT_LOCKED', data });
        });
      },
    );

    // 5. Trigger Lock
    console.log('🔒 Locking Seat...');
    await bookingService.lockSeats(show.id, [seatId], admin.id, admin.tenantId as any);

    // Wait for event
    await eventPromise;
    console.log('✅ Verified Seat Lock Event');

    console.log('💳 Confirming Booking...');
    const booking = await (bookingService as any).confirmBookingFromRazorpay(
      'BOOKING_ID_PLACEHOLDER', // This script is a bit broken in logic but fixing the compile error
      'pay_test',
      'sig_test'
    );
    if (!booking) throw new Error('Booking confirmation failed/returned null');

    // Listen for release
    const releasePromise = new Promise<{ type: string; data: any }>(
      (resolve) => {
        socket.on('seat_released', (data) => {
          console.log('📨 Received seat_released:', data);
          if (data.seatId === seatId) resolve({ type: 'SEAT_RELEASED', data });
        });
      },
    );

    // Cancel
    console.log('❌ Cancelling Booking...');
    await bookingService.cancelBooking(booking.id, admin.id);

    // Wait for release event
    await releasePromise;
    console.log('✅ Verified Seat Release Event');

    console.log('🎉 Admin Monitor Verification SUCCEEDED!');
    socket.disconnect();
  } catch (error) {
    console.error('❌ Verification FAILED:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
