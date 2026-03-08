"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const clean_db_1 = require("./utils/clean-db");
const create_test_app_1 = require("./utils/create-test-app");
const auth_helper_1 = require("./utils/auth-helper");
const booking_service_1 = require("../src/booking/booking.service");
const client_1 = require("@prisma/client");
describe('Monetization Layer (E2E)', () => {
    let app;
    let adminToken;
    let userToken;
    let tenantId;
    let showId;
    let bookingService;
    beforeAll(async () => {
        app = await (0, create_test_app_1.createTestApp)();
        bookingService = app.get(booking_service_1.BookingService);
    });
    beforeEach(async () => {
        await (0, clean_db_1.cleanDatabase)();
        let tenant = await clean_db_1.prisma.tenant.findUnique({ where: { slug: 'starpass' } });
        if (!tenant) {
            tenant = await clean_db_1.prisma.tenant.create({
                data: {
                    name: 'StarPass',
                    slug: 'starpass',
                    isActive: true
                }
            });
        }
        tenantId = tenant.id;
        const adminEmail = 'admin@starpass.com';
        await clean_db_1.prisma.user.upsert({
            where: { email: adminEmail },
            update: { role: client_1.Role.SUPER_ADMIN },
            create: {
                email: adminEmail,
                name: 'Admin',
                role: client_1.Role.SUPER_ADMIN,
                password: 'hashed_password',
                tenant: { connect: { id: tenantId } },
            },
        });
        adminToken = await (0, auth_helper_1.loginUser)(app, adminEmail);
        userToken = await (0, auth_helper_1.loginUser)(app, 'buyer@test.com');
        const theater = await clean_db_1.prisma.theater.create({
            data: {
                name: 'Grand Rex',
                city: 'Paris',
                address: '1 Bd Poissonniere',
                tenantId,
                screens: { create: [{ name: 'Screen 1', totalRows: 10, seatsPerRow: 10, tenantId }] },
            },
            include: { screens: true },
        });
        const screen = theater.screens[0];
        const event = await clean_db_1.prisma.event.create({
            data: {
                title: 'Test Concert',
                description: 'Test',
                date: new Date(Date.now() + 86400000),
                location: 'Space',
                price: 100,
                totalSeats: 100,
                availableSeats: 100,
                type: 'CONCERT',
                language: 'English',
                duration: 120,
                tenantId,
            },
        });
        const seat = await clean_db_1.prisma.seat.create({
            data: { screenId: screen.id, row: 'A', number: 1, tenantId },
        });
        const show = await bookingService.createShow({
            eventId: event.id,
            screenId: screen.id,
            startTime: new Date(Date.now() + 86400000).toISOString(),
            price: 100,
            tenantId,
        });
        await clean_db_1.prisma.seatAvailability.create({
            data: { showId: show.id, seatId: seat.id, status: 'AVAILABLE', tenantId },
        });
        showId = show.id;
    });
    afterAll(async () => {
        await app.close();
        await clean_db_1.prisma.$disconnect();
    });
    it('should apply percentage fee correctly (2%)', async () => {
        const setupRes = await (0, supertest_1.default)(app.getHttpServer())
            .patch(`/tenants/${tenantId}/monetization`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-tenant-slug', 'starpass')
            .send({ enabled: true, type: client_1.PlatformFeeType.PERCENTAGE, value: 2 });
        if (setupRes.status !== 200) {
            console.error('FAILED TO SET MONETIZATION:', setupRes.body);
        }
        expect(setupRes.status).toBe(200);
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post(`/shows/${showId}/lock-seats`)
            .set('Authorization', `Bearer ${userToken}`)
            .set('x-tenant-slug', 'starpass')
            .send({ seatIds: ['A1'] })
            .expect(201);
        const bookingId = res.body.bookingId;
        const booking = await clean_db_1.prisma.booking.findUnique({ where: { id: bookingId } });
        expect(Number(booking?.ticketAmount)).toBe(100);
        expect(Number(booking?.platformFeeAmount)).toBe(2);
        expect(Number(booking?.totalAmount)).toBe(102);
        const orderRes = await (0, supertest_1.default)(app.getHttpServer())
            .post('/payments/create-order')
            .set('Authorization', `Bearer ${userToken}`)
            .set('x-tenant-slug', 'starpass')
            .send({ bookingId })
            .expect(201);
        expect(orderRes.body.amount).toBe(10200);
    });
    it('should apply flat fee correctly (₹50)', async () => {
        await (0, supertest_1.default)(app.getHttpServer())
            .patch(`/tenants/${tenantId}/monetization`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-tenant-slug', 'starpass')
            .send({ enabled: true, type: client_1.PlatformFeeType.FLAT, value: 50 })
            .expect(200);
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post(`/shows/${showId}/lock-seats`)
            .set('Authorization', `Bearer ${userToken}`)
            .set('x-tenant-slug', 'starpass')
            .send({ seatIds: ['A1'] })
            .expect(201);
        const bookingId = res.body.bookingId;
        const booking = await clean_db_1.prisma.booking.findUnique({ where: { id: bookingId } });
        expect(Number(booking?.ticketAmount)).toBe(100);
        expect(Number(booking?.platformFeeAmount)).toBe(50);
        expect(Number(booking?.totalAmount)).toBe(150);
    });
    it('should aggregate settlement analytics correctly', async () => {
        await clean_db_1.prisma.tenant.update({
            where: { id: tenantId },
            data: { platformFeeEnabled: true, platformFeeType: client_1.PlatformFeeType.PERCENTAGE, platformFeeValue: 10 }
        });
        const user = await clean_db_1.prisma.user.findFirst({ where: { email: 'buyer@test.com' } });
        await clean_db_1.prisma.booking.create({
            data: {
                userId: user.id,
                showId,
                tenantId,
                ticketAmount: 100,
                platformFeeAmount: 10,
                totalAmount: 110,
                theaterNetAmount: 100,
                status: 'CONFIRMED',
            }
        });
        await clean_db_1.prisma.booking.create({
            data: {
                userId: user.id,
                showId,
                tenantId,
                ticketAmount: 100,
                platformFeeAmount: 10,
                totalAmount: 110,
                theaterNetAmount: 100,
                status: 'CANCELLED',
            }
        });
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .get(`/analytics/settlement?tenantId=${tenantId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-tenant-slug', 'starpass')
            .expect(200);
        expect(res.body.confirmedBookings).toBe(1);
        expect(Number(res.body.grossRevenue)).toBe(110);
        expect(Number(res.body.platformFees)).toBe(10);
        expect(Number(res.body.theaterNetPayable)).toBe(100);
    });
});
//# sourceMappingURL=monetization.e2e-spec.js.map