const { PrismaClient } = require('@prisma/client');

async function checkDb(url) {
  console.log(`Checking DB: ${url}`);
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });
  try {
    const userCount = await prisma.user.count();
    const admin = await prisma.user.findFirst({ where: { name: 'admin' } });
    console.log(`  User count: ${userCount}`);
    console.log(`  Admin found: ${admin ? admin.email : 'No'}`);
    
    const lockedBookings = await prisma.booking.findMany({
      where: { status: 'LOCKED' },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log(`  Locked bookings: ${lockedBookings.length}`);
    if (lockedBookings.length > 0) {
      console.log(`  Latest LOCKED booking:`, JSON.stringify(lockedBookings[0], null, 2));
    }
  } catch (err) {
    console.log(`  Failed to connect: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await checkDb('postgresql://postgres:password@127.0.0.1:5432/ticket_booking');
  await checkDb('postgresql://postgres:postgres@127.0.0.1:5433/ticket_booking');
}

main();
