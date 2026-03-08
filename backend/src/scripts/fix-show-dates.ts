import { PrismaClient } from '@prisma/client';

/**
 * 🎯 STRICT STABILIZATION: Development Data Fix Script
 * Goal: Ensure events appear on /events by fixing past dates and inactivity.
 * Rule: DATA FIX ONLY. Do NOT touch business logic or services.
 */
async function main() {
  const prisma = new PrismaClient();
  console.log('🔄 STABILIZATION: Fixing Show dates and status for development...');

  // Set to 7 days in the future
  const newShowTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    // 1. Update all Shows (Strict Requirement)
    const showUpdate = await prisma.show.updateMany({
      data: {
        startTime: newShowTime,
        isActive: true,
      },
    });
    console.log(`✅ Updated ${showUpdate.count} shows: startTime set to ${newShowTime.toISOString()}, isActive = true`);

    // 2. Update all Events (Necessary for visibility as EventService filters by Event.date)
    const eventUpdate = await prisma.event.updateMany({
      data: {
        date: newShowTime,
      }
    });
    console.log(`✅ Updated ${eventUpdate.count} events: date set to ${newShowTime.toISOString()}`);

    console.log('🎉 Data stabilization complete! Events should now appear on /events.');
  } catch (error) {
    console.error('❌ Data fix failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
