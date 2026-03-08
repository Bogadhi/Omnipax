import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  console.log('--- Testing Event.findMany with shows include ---');
  try {
    const events = await prisma.event.findMany({
      include: {
        shows: {
          include: {
            screen: { include: { theater: true } },
            seatAvailability: true,
          },
        },
      },
    });
    console.log(`Success! Found ${events.length} events.`);
    if (events.length > 0 && events[0].shows.length > 0) {
        console.log('First show:', JSON.stringify(events[0].shows[0], null, 2));
    }
  } catch (e: any) {
    console.error('FAILED!', e.message);
  }

  await prisma.$disconnect();
}

main();
