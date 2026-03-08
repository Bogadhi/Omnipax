"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const clean_db_1 = require("./utils/clean-db");
const create_test_app_1 = require("./utils/create-test-app");
const auth_helper_1 = require("./utils/auth-helper");
describe('Concurrency (E2E)', () => {
    let app;
    let authToken;
    let showId;
    beforeAll(async () => {
        app = await (0, create_test_app_1.createTestApp)();
    });
    beforeEach(async () => {
        await (0, clean_db_1.cleanDatabase)();
        authToken = await (0, auth_helper_1.loginUser)(app, 'concurrent@test.com');
        const theater = await clean_db_1.prisma.theater.create({
            data: {
                name: 'Concurrent Rex',
                city: 'Paris',
                address: '1 Bd Poissonniere',
                screens: { create: [{ name: 'Screen 1', totalRows: 10, seatsPerRow: 10 }] },
            },
            include: { screens: true },
        });
        const screen = theater.screens[0];
        const event = await clean_db_1.prisma.event.create({
            data: {
                title: 'High Demand Concert',
                description: 'Race condition test',
                date: new Date(Date.now() + 86400000),
                location: 'Virtual',
                price: 100,
                totalSeats: 100,
                availableSeats: 100,
                type: 'CONCERT',
                language: 'English',
                duration: 120,
            },
        });
        const show = await clean_db_1.prisma.show.create({
            data: {
                eventId: event.id,
                screenId: screen.id,
                startTime: new Date(Date.now() + 86400000),
                price: 10.0,
            },
        });
        showId = show.id;
    });
    afterAll(async () => {
        await app.close();
        await clean_db_1.prisma.$disconnect();
    });
    it('should only allow 1 successful lock when 10 users compete for 1 seat', async () => {
        const seatId = 'A1';
        const numberOfRequests = 10;
        const requests = Array.from({ length: numberOfRequests }).map(() => {
            return (0, supertest_1.default)(app.getHttpServer())
                .post('/bookings/lock')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ showId, seatId });
        });
        const responses = await Promise.allSettled(requests);
        const successCount = responses.filter((r) => r.status === 'fulfilled' && r.value.status === 201).length;
        const failCount = responses.filter((r) => r.status === 'fulfilled' && r.value.status === 400).length;
        console.log(`Concurrency Results: Success=${successCount}, Fail=${failCount}`);
        expect(successCount).toBe(1);
        expect(failCount).toBe(numberOfRequests - 1);
        const locksCount = await clean_db_1.prisma.booking.count({
            where: { showId, status: 'LOCKED' },
        });
        expect(locksCount).toBe(1);
        const lockedBooking = await clean_db_1.prisma.booking.findFirst({
            where: { showId, status: 'LOCKED' },
            include: { bookingSeats: true },
        });
        expect(lockedBooking?.bookingSeats[0].seatId).toBe(seatId);
    }, 10000);
});
//# sourceMappingURL=concurrency.e2e-spec.js.map