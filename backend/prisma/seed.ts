import { PrismaClient, EventType, SeatStatus, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Multi-Tenant Seed...');

  // 1. Create Default Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'starpass' },
    update: {
      name: 'StarPass Main',
      isActive: true,
    },
    create: {
      slug: 'starpass',
      name: 'StarPass Main',
      isActive: true,
    },
  });
  console.log(`✅ Tenant ensured: ${tenant.slug}`);

  // 2. Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      role: Role.ADMIN,
      isVerified: true,
      tenant: { connect: { id: tenant.id } },
    },
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'System Admin',
      role: Role.ADMIN,
      isVerified: true,
      tenant: { connect: { id: tenant.id } },
    },
  });
  console.log(`✅ Admin user ensured: ${admin.email}`);

  // 3. Create Theater
  const theater = await prisma.theater.upsert({
    where: { id: 'default-theater' },
    update: {
      name: 'StarPass Premium Cinema',
      city: 'Mumbai',
      address: 'StarPass Plaza, Mumbai',
      tenantId: tenant.id,
    },
    create: {
      id: 'default-theater',
      name: 'StarPass Premium Cinema',
      city: 'Mumbai',
      address: 'StarPass Plaza, Mumbai',
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Theater ensured: ${theater.name}`);

  // 4. Create Screen
  const screen = await prisma.screen.upsert({
    where: { id: 'default-screen-1' },
    update: {
      name: 'IMAX Screen 1',
      totalRows: 10,
      seatsPerRow: 12,
      theaterId: theater.id,
      tenantId: tenant.id,
    },
    create: {
      id: 'default-screen-1',
      name: 'IMAX Screen 1',
      totalRows: 10,
      seatsPerRow: 12,
      theaterId: theater.id,
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Screen ensured: ${screen.name}`);

  // 5. Create Seats (Idempotent check)
  const seatCount = await prisma.seat.count({ where: { screenId: screen.id } });
  if (seatCount === 0) {
    const seatsData = [];
    for (let r = 0; r < 10; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let s = 1; s <= 12; s++) {
        seatsData.push({
          screenId: screen.id,
          row: rowLabel,
          number: s,
          tenantId: tenant.id,
        });
      }
    }
    await prisma.seat.createMany({ data: seatsData });
    console.log(`✅ Created 120 seats for ${screen.name}`);
  }

  // 6. Create Event
  const event = await prisma.event.upsert({
    where: { id: 'dune-part-2-starpass' },
    update: {
      title: 'Dune: Part Two',
      type: EventType.MOVIE,
      language: 'English',
      duration: 166,
      location: theater.name,
      price: 350,
      availableSeats: 120,
      totalSeats: 120,
      isActive: true,
      date: new Date(Date.now() + 86400000 * 2), // 2 days from now
      tenantId: tenant.id,
    },
    create: {
      id: 'dune-part-2-starpass',
      title: 'Dune: Part Two',
      type: EventType.MOVIE,
      language: 'English',
      duration: 166,
      location: theater.name,
      price: 350,
      availableSeats: 120,
      totalSeats: 120,
      isActive: true,
      date: new Date(Date.now() + 86400000 * 2),
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Event ensured: ${event.title}`);

  // 7. Create Show
  const show = await prisma.show.upsert({
    where: { id: 'default-show-1' },
    update: {
      startTime: event.date,
      price: event.price,
      totalCapacity: 120,
      remainingCapacity: 120,
      eventId: event.id,
      screenId: screen.id,
      tenantId: tenant.id,
    },
    create: {
      id: 'default-show-1',
      startTime: event.date,
      price: event.price,
      totalCapacity: 120,
      remainingCapacity: 120,
      eventId: event.id,
      screenId: screen.id,
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Show ensured at ${show.startTime}`);

  // 8. Generate Seat Availability
  const availabilityCount = await prisma.seatAvailability.count({ where: { showId: show.id } });
  if (availabilityCount === 0) {
    const seats = await prisma.seat.findMany({ where: { screenId: screen.id } });
    const availabilityData = seats.map((seat) => ({
      showId: show.id,
      seatId: seat.id,
      status: SeatStatus.AVAILABLE,
      tenantId: tenant.id,
    }));
    await prisma.seatAvailability.createMany({ data: availabilityData });
    console.log(`✅ Generated seat availability for Show: ${show.id}`);
  }

  console.log('🏁 Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });