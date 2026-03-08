"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const clean_db_1 = require("./utils/clean-db");
const create_test_app_1 = require("./utils/create-test-app");
const auth_helper_1 = require("./utils/auth-helper");
const uuid_1 = require("uuid");
const booking_service_1 = require("../src/booking/booking.service");
describe('Idempotency (E2E)', () => {
    let app;
    let authToken;
    let showId;
    let bookingService;
    beforeAll(async () => {
        app = await (0, create_test_app_1.createTestApp)();
        bookingService = app.get(booking_service_1.BookingService);
    });
    beforeEach(async () => {
        await (0, clean_db_1.cleanDatabase)();
        authToken = await (0, auth_helper_1.loginUser)(app, 'idem@test.com');
        const tenant = await clean_db_1.prisma.tenant.findUnique({ where: { slug: 'starpass' } });
        const theater = await clean_db_1.prisma.theater.create({
            data: {
                name: 'Idempotency Rex',
                city: 'Paris',
                address: '1 Bd Poissonniere',
                tenantId: tenant.id,
                screens: { create: [{ name: 'Screen 1', totalRows: 10, seatsPerRow: 10, tenantId: tenant.id }] },
            },
            include: { screens: true },
        });
        const screen = theater.screens[0];
        const event = await clean_db_1.prisma.event.create({
            data: {
                title: 'Idempotency Event',
                description: 'Test',
                date: new Date(Date.now() + 86400000),
                location: 'Space',
                price: 10,
                totalSeats: 100,
                availableSeats: 100,
                type: 'CONCERT',
                language: 'English',
                duration: 120,
                tenantId: tenant.id,
            },
        });
        const seat = await clean_db_1.prisma.seat.create({
            data: {
                screenId: screen.id,
                row: 'A',
                number: 1,
                tenantId: tenant.id,
            },
        });
        const show = await bookingService.createShow({
            eventId: event.id,
            screenId: screen.id,
            startTime: new Date(Date.now() + 86400000).toISOString(),
            price: 10,
            tenantId: tenant.id,
        });
        await clean_db_1.prisma.seatAvailability.create({
            data: {
                showId: show.id,
                seatId: seat.id,
                status: 'AVAILABLE',
                tenantId: tenant.id,
            }
        });
        showId = show.id;
    });
    afterAll(async () => {
        await app.close();
        await clean_db_1.prisma.$disconnect();
    });
    it('should return cached response for duplicate request', async () => {
        const idempotencyKey = (0, uuid_1.v4)();
        const payload = { seatIds: ['A-1'] };
        const actualPayload = { seatIds: ['A1'] };
        const res1 = await (0, supertest_1.default)(app.getHttpServer())
            .post(`/shows/${showId}/lock-seats`)
            .set('Authorization', `Bearer ${authToken}`)
            .set('x-tenant-slug', 'starpass')
            .set('Idempotency-Key', idempotencyKey)
            .send(actualPayload);
        console.log('RES1 STATUS:', res1.status, 'BODY:', res1.body);
        expect(res1.status).toBe(201);
        await new Promise(r => setTimeout(r, 100));
        const res2 = await (0, supertest_1.default)(app.getHttpServer())
            .post(`/shows/${showId}/lock-seats`)
            .set('Authorization', `Bearer ${authToken}`)
            .set('x-tenant-slug', 'starpass')
            .set('Idempotency-Key', idempotencyKey)
            .send(actualPayload);
        expect(res2.status).toBe(201);
        expect(res2.body).toEqual(res1.body);
        const bookingsCount = await clean_db_1.prisma.booking.count();
        expect(bookingsCount).toBe(1);
    });
});
//# sourceMappingURL=idempotency.e2e-spec.js.map