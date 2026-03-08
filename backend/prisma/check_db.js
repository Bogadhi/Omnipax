"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const eventCount = await prisma.event.count();
    const showCount = await prisma.show.count();
    const theaterCount = await prisma.theater.count();
    const screenCount = await prisma.screen.count();
    const seatAvailabilityCount = await prisma.seatAvailability.count();
    const bookingCount = await prisma.booking.count();
    console.log({
        eventCount,
        showCount,
        theaterCount,
        screenCount,
        seatAvailabilityCount,
        bookingCount,
    });
    const events = await prisma.event.findMany({
        include: {
            shows: {
                where: { isActive: true },
                take: 1
            }
        }
    });
    console.log('Events Sample:', JSON.stringify(events, null, 2));
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=check_db.js.map