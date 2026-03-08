"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting Multi-Tenant Seed...');
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
    const adminPassword = await bcrypt_1.default.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
            role: client_1.Role.ADMIN,
            isVerified: true,
            tenant: { connect: { id: tenant.id } },
        },
        create: {
            email: 'admin@example.com',
            password: adminPassword,
            name: 'System Admin',
            role: client_1.Role.ADMIN,
            isVerified: true,
            tenant: { connect: { id: tenant.id } },
        },
    });
    console.log(`✅ Admin user ensured: ${admin.email}`);
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
    const event = await prisma.event.upsert({
        where: { id: 'dune-part-2-starpass' },
        update: {
            title: 'Dune: Part Two',
            type: client_1.EventType.MOVIE,
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
        create: {
            id: 'dune-part-2-starpass',
            title: 'Dune: Part Two',
            type: client_1.EventType.MOVIE,
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
    const availabilityCount = await prisma.seatAvailability.count({ where: { showId: show.id } });
    if (availabilityCount === 0) {
        const seats = await prisma.seat.findMany({ where: { screenId: screen.id } });
        const availabilityData = seats.map((seat) => ({
            showId: show.id,
            seatId: seat.id,
            status: client_1.SeatStatus.AVAILABLE,
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
//# sourceMappingURL=seed.js.map