import { PrismaClient, SeatStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Deep repair: finds screens with no seats, creates seats for them,
 * then populates SeatAvailability for all shows on those screens.
 * Idempotent — skips shows/screens that already have seats.
 */
async function main() {
  // Audit current state
  const screens = await prisma.screen.findMany({
    include: {
      seats: { select: { id: true } },
      shows: {
        include: { seatAvailability: { select: { id: true } } },
      },
    },
  });

  console.log(`Found ${screens.length} screens.`);

  for (const screen of screens) {
    const seatCount = screen.seats.length;
    console.log(`\nScreen "${screen.name}" (${screen.id}): ${seatCount} seats, ${screen.shows.length} shows`);

    // Step 1: Create seats if screen has none
    if (seatCount === 0) {
      const rows = screen.totalRows ?? 10;
      const perRow = screen.seatsPerRow ?? 10;
      console.log(`  → Generating ${rows * perRow} seats (${rows} rows × ${perRow})...`);

      const seatsData = [];
      for (let r = 0; r < rows; r++) {
        const rowLabel = String.fromCharCode(65 + r);
        for (let s = 1; s <= perRow; s++) {
          seatsData.push({ screenId: screen.id, row: rowLabel, number: s });
        }
      }

      await prisma.seat.createMany({ data: seatsData, skipDuplicates: true });
      console.log(`  ✓ Seats created.`);
    }

    // Step 2: For each show on this screen, populate SeatAvailability if empty
    const freshSeats = await prisma.seat.findMany({
      where: { screenId: screen.id },
      select: { id: true },
    });

    for (const show of screen.shows) {
      if (show.seatAvailability.length > 0) {
        console.log(`  Show ${show.id}: already has ${show.seatAvailability.length} availability rows — skipping.`);
        continue;
      }

      console.log(`  Show ${show.id}: creating ${freshSeats.length} SeatAvailability rows...`);

      await prisma.$transaction(async (tx) => {
        await tx.seatAvailability.createMany({
          data: freshSeats.map((seat) => ({
            showId: show.id,
            seatId: seat.id,
            status: SeatStatus.AVAILABLE,
          })),
          skipDuplicates: true,
        });

        await tx.show.update({
          where: { id: show.id },
          data: {
            totalCapacity: freshSeats.length,
            remainingCapacity: freshSeats.length,
          },
        });
      });

      console.log(`  ✓ Show ${show.id} repaired: ${freshSeats.length} AVAILABLE seats.`);
    }
  }

  // Final verification
  const finalCounts = await (prisma as any).seatAvailability.groupBy({
    by: ['status'],
    _count: { status: true },
  });
  console.log('\n=== FINAL SeatAvailability breakdown ===');
  console.log(JSON.stringify(finalCounts, null, 2));

  const finalShows = await prisma.show.findMany({
    select: { id: true, totalCapacity: true, remainingCapacity: true },
  });
  console.log('\n=== FINAL Show capacities ===');
  console.log(JSON.stringify(finalShows, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
