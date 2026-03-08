"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const clean_db_1 = require("./utils/clean-db");
const create_test_app_1 = require("./utils/create-test-app");
const auth_helper_1 = require("./utils/auth-helper");
const uuid_1 = require("uuid");
const crypto = __importStar(require("crypto"));
const booking_service_1 = require("../src/booking/booking.service");
describe('Booking Integrity (E2E)', () => {
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
        authToken = await (0, auth_helper_1.loginUser)(app, 'buyer@test.com');
        const tenant = await clean_db_1.prisma.tenant.findUnique({ where: { slug: 'starpass' } });
        const theater = await clean_db_1.prisma.theater.create({
            data: {
                name: 'Grand Rex',
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
                title: 'Test Concert',
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
        const seat1 = await clean_db_1.prisma.seat.create({
            data: { screenId: screen.id, row: 'A', number: 1, tenantId: tenant.id },
        });
        const seat2 = await clean_db_1.prisma.seat.create({
            data: { screenId: screen.id, row: 'A', number: 2, tenantId: tenant.id },
        });
        const seat3 = await clean_db_1.prisma.seat.create({
            data: { screenId: screen.id, row: 'A', number: 3, tenantId: tenant.id },
        });
        const show = await bookingService.createShow({
            eventId: event.id,
            screenId: screen.id,
            startTime: new Date(Date.now() + 86400000).toISOString(),
            price: 10,
            tenantId: tenant.id,
        });
        await clean_db_1.prisma.seatAvailability.createMany({
            data: [
                { showId: show.id, seatId: seat1.id, status: 'AVAILABLE', tenantId: tenant.id },
                { showId: show.id, seatId: seat2.id, status: 'AVAILABLE', tenantId: tenant.id },
                { showId: show.id, seatId: seat3.id, status: 'AVAILABLE', tenantId: tenant.id },
            ]
        });
        showId = show.id;
    });
    afterAll(async () => {
        await app.close();
        await clean_db_1.prisma.$disconnect();
    });
    it('should successfully lock, create order, and confirm a booking', async () => {
        const seatId = 'A1';
        const lockRes = await (0, supertest_1.default)(app.getHttpServer())
            .post(`/shows/${showId}/lock-seats`)
            .set('Authorization', `Bearer ${authToken}`)
            .set('x-tenant-slug', 'starpass')
            .send({ seatIds: [seatId] });
        expect(lockRes.status).toBe(201);
        const bookingId = lockRes.body.bookingId || lockRes.body.id;
        expect(bookingId).toBeDefined();
        const lockedBooking = await clean_db_1.prisma.booking.findFirst({
            where: { id: bookingId },
        });
        expect(lockedBooking).toBeDefined();
        expect(lockedBooking?.status).toBe('LOCKED');
        const orderRes = await (0, supertest_1.default)(app.getHttpServer())
            .post('/payments/create-order')
            .set('Authorization', `Bearer ${authToken}`)
            .set('x-tenant-slug', 'starpass')
            .send({ bookingId });
        expect(orderRes.status).toBe(201);
        const razorpayOrderId = orderRes.body.orderId;
        expect(razorpayOrderId).toBeDefined();
        const inProgressBooking = await clean_db_1.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        expect(inProgressBooking?.status).toBe('PAYMENT_IN_PROGRESS');
        const razorpayPaymentId = 'pay_' + (0, uuid_1.v4)().substring(0, 10);
        const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
        const razorpaySignature = crypto.createHmac('sha256', secret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');
        const confirmRes = await (0, supertest_1.default)(app.getHttpServer())
            .post('/bookings/confirm')
            .set('Authorization', `Bearer ${authToken}`)
            .set('x-tenant-slug', 'starpass')
            .send({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        });
        expect(confirmRes.status).toBe(201);
        const confirmedBooking = await clean_db_1.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        expect(confirmedBooking?.status).toBe('CONFIRMED');
        expect(confirmedBooking?.razorpayPaymentId).toBe(razorpayPaymentId);
    });
    it('should fail to lock an already locked seat', async () => {
        const seatId = 'A2';
        await (0, supertest_1.default)(app.getHttpServer())
            .post(`/shows/${showId}/lock-seats`)
            .set('Authorization', `Bearer ${authToken}`)
            .set('x-tenant-slug', 'starpass')
            .send({ seatIds: [seatId] })
            .expect(201);
        const user2Token = await (0, auth_helper_1.loginUser)(app, 'other@test.com');
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post(`/shows/${showId}/lock-seats`)
            .set('Authorization', `Bearer ${user2Token}`)
            .set('x-tenant-slug', 'starpass')
            .send({ seatIds: [seatId] });
        expect(res.status).toBe(409);
        expect(res.body.message).toContain('already locked');
    });
    it('should fail to create order without locking first', async () => {
        const fakeId = (0, uuid_1.v4)();
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post('/payments/create-order')
            .set('Authorization', `Bearer ${authToken}`)
            .set('x-tenant-slug', 'starpass')
            .send({ bookingId: fakeId });
        expect([400, 404]).toContain(res.status);
    });
});
//# sourceMappingURL=booking.e2e-spec.js.map