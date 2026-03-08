const { PrismaClient, BookingStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const tenantId = '100475c8-8093-444e-a131-b4062133ecf3';
  const tenantFilter = { tenantId };

  try {
    console.log('1. Testing totalRevenue aggregate...');
    const totalRevenue = await prisma.booking.aggregate({
      where: { status: BookingStatus.CONFIRMED, ...tenantFilter },
      _sum: { totalAmount: true },
    });
    console.log('totalRevenue OK');

    console.log('2. Testing totalBookings count...');
    const totalBookings = await prisma.booking.count({
      where: { status: BookingStatus.CONFIRMED, ...tenantFilter },
    });
    console.log('totalBookings OK');

    console.log('3. Testing activeUsers count...');
    const activeUsers = await prisma.user.count({
      where: { tenantId },
    });
    console.log('activeUsers OK');

    console.log('4. Testing pendingActions count...');
    const pendingActions = await prisma.booking.count({
      where: {
        status: { in: [BookingStatus.CANCELLED, BookingStatus.FAILED] },
        ...tenantFilter,
      },
    });
    console.log('pendingActions OK');

    console.log('ALL OK');
  } catch (err) {
    console.error('CRASH', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
