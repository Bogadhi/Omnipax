import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. SeatAvailability status counts
  const statusCounts = await (prisma as any).seatAvailability.groupBy({
    by: ['status'],
    _count: { status: true },
  });
  console.log('=== SeatAvailability Status Breakdown ===');
  console.log(JSON.stringify(statusCounts, null, 2));

  // 2. Shows (GA capacity)
  const shows = await prisma.show.findMany({
    select: { id: true, totalCapacity: true, remainingCapacity: true, eventId: true },
  });
  console.log('\n=== Shows (capacity) ===');
  console.log(JSON.stringify(shows, null, 2));

  // 3. Booking status breakdown
  const bookingCounts = await prisma.booking.groupBy({
    by: ['status'],
    _count: { status: true },
  });
  console.log('\n=== Booking Status Breakdown ===');
  console.log(JSON.stringify(bookingCounts, null, 2));

  // 4. Stale LOCKED bookings
  const staleLocked = await prisma.booking.findMany({
    where: { status: 'LOCKED', expiresAt: { lt: new Date() } },
    select: { id: true, expiresAt: true, showId: true, userId: true },
  });
  console.log('\n=== Stale LOCKED bookings (past expiresAt) ===');
  console.log(JSON.stringify(staleLocked, null, 2));

  // 5. Stale LOCKED SeatAvailability rows
  const staleLockedSeats = await (prisma as any).seatAvailability.count({
    where: {
      status: 'LOCKED',
      lockedUntil: { lt: new Date() },
    },
  });
  console.log('\n=== Stale LOCKED seats (past lockedUntil) ===', staleLockedSeats);

  // 6. Total per show
  const perShow = await (prisma as any).seatAvailability.groupBy({
    by: ['showId', 'status'],
    _count: { status: true },
  });
  console.log('\n=== Per-Show seat status breakdown ===');
  console.log(JSON.stringify(perShow, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
