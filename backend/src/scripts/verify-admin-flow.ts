import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EventService } from '../event/event.service';
import { BookingService } from '../booking/booking.service';
import { AdminService } from '../admin/admin.service';
// import { CreateEventDto } from '../event/dto/create-event.dto';
// import { CreateShowDto } from '../booking/dto/create-show.dto';

import { PrismaService } from '../prisma/prisma.service';

// Workaround for Prisma Enum issue in script
const EventType = { MOVIE: 'MOVIE', CONCERT: 'CONCERT' } as any;
const SeatStatus = {
  AVAILABLE: 'AVAILABLE',
  LOCKED: 'LOCKED',
  BOOKED: 'BOOKED',
} as any;

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const eventService = app.get(EventService);
  const bookingService = app.get(BookingService);
  const adminService = app.get(AdminService);
  const prisma = app.get(PrismaService);

  console.log('🚀 Starting Verification Flow...');

  try {
    // 1. Create User directly via Prisma
    const email = `test-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Verification User',
        password: 'password123', // Dummy
        role: 'USER',
      },
    });
    console.log('✅ User Created:', user.email);

    // 2. Create Event (Admin)
    const eventDto: any = {
      // Use any to avoid strict DTO type issues in script
      title: `Verification Event ${Date.now()}`,
      type: 'MOVIE',
      language: 'English',
      duration: 120,
      date: new Date().toISOString(),
      location: 'Test Location',
      price: 100,
      description: 'Test Description',
      posterUrl: 'https://example.com/poster.jpg',
    };
    const event = await eventService.create(eventDto);
    console.log('✅ Event Created:', event.title);

    // 3. Create Show (Admin)
    const screen = await prisma.screen.findFirst();
    if (!screen) throw new Error('No screen found. Run seed first.');

    const showDto: any = {
      startTime: new Date(Date.now() + 3600000).toISOString(),
      price: 200,
      eventId: event.id,
      screenId: screen.id,
    };
    const show = await bookingService.createShow(showDto);
    console.log('✅ Show Created:', show.id);

    // 4. Verify Seat Availability Generation
    const seats = await bookingService.getSeats(show.id);
    if (seats.length === 0) throw new Error('Seat Availability NOT generated!');
    console.log(`✅ Seats Generated: ${seats.length} seats available.`);

    // 5. User Locks Seats
    const seatToLock = seats[0];
    const lockResult = await bookingService.lockSeats(show.id, [
      seatToLock.id,
    ], user.id, user.tenantId as any);
    if (!lockResult.success) throw new Error('Failed to lock seat');
    console.log('✅ Seat Locked:', seatToLock.id);

    // 6. Confirm Booking
    const stripePaymentId = 'pi_mock_' + Date.now();
    const booking = await (bookingService as any).confirmBookingFromStripe(
      lockResult.bookingId,
      stripePaymentId,
    );
    console.log('✅ Booking Confirmed:', booking?.id);

    // 7. Verify Admin Analytics
    const analytics = await adminService.getAnalyticsOverview();
    console.log('✅ Admin Analytics:', analytics);

    // Check if bookings > 0 (might include previous runs, which is fine)
    if (analytics.totalBookings === 0)
      throw new Error('Analytics failed to count booking.');

    console.log('🎉 Verification SUCCEEDED!');
  } catch (error) {
    console.error('❌ Verification FAILED:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
