import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- START DIAGNOSTIC ---');
  const event = await prisma.event.findFirst({
    where: { title: { contains: 'Dune' } },
    include: {
      shows: {
        include: {
          seatAvailability: {
            include: { seat: true },
            take: 5
          }
        }
      }
    }
  });

  if (!event) {
    console.log('No event found with title Dune');
  } else {
    console.log('Event Found:', event.id, event.title);
    if (event.shows.length === 0) {
      console.log('No shows found for this event');
    } else {
      const firstShow = event.shows[0];
      console.log('First Show ID:', firstShow.id);
      console.log('Seats Count:', firstShow.seatAvailability.length);
      if (firstShow.seatAvailability.length > 0) {
        const firstSeat = firstShow.seatAvailability[0];
        console.log('First Seat Relation:', JSON.stringify(firstSeat.seat, null, 2));
      }
    }
  }
  console.log('--- END DIAGNOSTIC ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
