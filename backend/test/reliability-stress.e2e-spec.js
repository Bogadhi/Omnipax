"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_test_app_1 = require("./utils/create-test-app");
const clean_db_1 = require("./utils/clean-db");
const payment_service_1 = require("../src/payment/payment.service");
const client_1 = require("@prisma/client");
const anomaly_detection_service_1 = require("../src/platform/anomaly-detection.service");
const reliability_processor_1 = require("../src/platform/reliability.processor");
const payment_reconciliation_service_1 = require("../src/payment/payment-reconciliation.service");
const booking_service_1 = require("../src/booking/booking.service");
describe('Reliability Stress Test Suite (E2E)', () => {
    let app;
    let paymentService;
    let anomalyService;
    let processor;
    let reconService;
    let bookingService;
    let testTenantId;
    let testUserId;
    let testShowId;
    beforeAll(async () => {
        try {
            app = await (0, create_test_app_1.createTestApp)();
            paymentService = app.get(payment_service_1.PaymentService);
            anomalyService = app.get(anomaly_detection_service_1.AnomalyDetectionService);
            processor = app.get(reliability_processor_1.ReliabilityProcessor);
            reconService = app.get(payment_reconciliation_service_1.PaymentReconciliationService);
            bookingService = app.get(booking_service_1.BookingService);
        }
        catch (err) {
            console.error('FAILED TO START APP IN beforeAll', err);
            throw err;
        }
    });
    beforeEach(async () => {
        try {
            await (0, clean_db_1.cleanDatabase)();
            const tenant = await clean_db_1.prisma.tenant.create({
                data: { name: 'Stress Test Tenant', slug: `stress-${Date.now()}` },
            });
            testTenantId = tenant.id;
            await clean_db_1.prisma.tenant.upsert({
                where: { slug: 'starpass' },
                update: {},
                create: { name: 'StarPass', slug: 'starpass' }
            });
            const user = await clean_db_1.prisma.user.create({
                data: {
                    email: `stress-user-${Date.now()}@test.com`,
                    password: 'password',
                    role: client_1.Role.USER,
                    tenantId: testTenantId
                },
            });
            testUserId = user.id;
            const event = await clean_db_1.prisma.event.create({
                data: {
                    title: 'Stress Test Event',
                    type: 'MOVIE',
                    language: 'English',
                    duration: 120,
                    date: new Date(),
                    location: 'Test Cinema',
                    price: 500,
                    tenantId: testTenantId,
                }
            });
            const theater = await clean_db_1.prisma.theater.create({
                data: { name: 'Stress Theater', city: 'Test City', address: 'Test Addr', tenantId: testTenantId }
            });
            const screen = await clean_db_1.prisma.screen.create({
                data: { name: 'Stress Screen', totalRows: 10, seatsPerRow: 10, theaterId: theater.id, tenantId: testTenantId }
            });
            const show = await clean_db_1.prisma.show.create({
                data: {
                    startTime: new Date(),
                    price: 500,
                    eventId: event.id,
                    screenId: screen.id,
                    tenantId: testTenantId,
                }
            });
            testShowId = show.id;
            await clean_db_1.prisma.seat.create({
                data: { screenId: screen.id, row: 'Z', number: 99, tenantId: testTenantId }
            });
        }
        catch (err) {
            console.error('FAILED IN beforeEach', err);
            throw err;
        }
    });
    async function createLockedBooking(bookingIdOverride, status = 'LOCKED') {
        const bookingId = bookingIdOverride || `stress-bk-${Date.now()}`;
        const booking = await clean_db_1.prisma.booking.create({
            data: {
                id: bookingId,
                userId: testUserId,
                showId: testShowId,
                totalAmount: 500,
                finalAmount: 500,
                status: status,
                tenantId: testTenantId,
            }
        });
        const seat = await clean_db_1.prisma.seat.findFirst({ where: { tenantId: testTenantId } });
        await clean_db_1.prisma.bookingSeat.create({
            data: {
                bookingId: booking.id,
                seatId: seat.id,
                price: 500,
                tenantId: testTenantId
            }
        });
        await clean_db_1.prisma.seatLock.create({
            data: {
                bookingId: booking.id,
                userId: testUserId,
                showId: testShowId,
                seatNumber: `${seat.row}${seat.number}`,
                status: 'LOCKED',
                expiresAt: new Date(Date.now() + 600000),
                tenantId: testTenantId
            }
        });
        return booking;
    }
    afterAll(async () => {
        try {
            if (app)
                await app.close();
            await clean_db_1.prisma.$disconnect();
        }
        catch (e) { }
    });
    it('TEST 1: Circuit Breaker Open State', async () => {
        const mockRazorpay = {
            orders: { create: jest.fn().mockRejectedValue(new Error('Outage')) },
        };
        paymentService.razorpay = mockRazorpay;
        const booking = await createLockedBooking();
        for (let i = 0; i < 5; i++) {
            try {
                await paymentService.createRazorpayOrder(booking.id, testUserId);
            }
            catch (e) { }
        }
        try {
            await paymentService.createRazorpayOrder(booking.id, testUserId);
            throw new Error('Should throw');
        }
        catch (e) {
            expect(e.response?.errorCode || e.errorCode).toBe('CIRCUIT_OPEN');
        }
        expect(paymentService.circuitState).toBe(1);
    });
    it('TEST 2: Webhook Idempotency & PaymentLog uniqueness', async () => {
        const booking = await createLockedBooking(undefined, 'LOCKED');
        await clean_db_1.prisma.booking.update({
            where: { id: booking.id },
            data: { razorpayOrderId: 'order_1' }
        });
        jest.spyOn(reconService, 'verifyPayment').mockResolvedValue(true);
        for (let i = 0; i < 3; i++) {
            await reconService.reconcileBooking(booking.id, 'order_1', 'pay_1', { t: 1 }, testTenantId);
        }
        const logs = await clean_db_1.prisma.paymentLog.findMany({ where: { razorpayPaymentId: 'pay_1' } });
        expect(logs.length).toBe(1);
        const updatedBooking = await clean_db_1.prisma.booking.findUnique({ where: { id: booking.id } });
        expect(updatedBooking?.status).toBe('CONFIRMED');
    });
    it('TEST 3: Delayed Webhook Reconciliation Job', async () => {
        const booking = await createLockedBooking(undefined, 'PENDING');
        await clean_db_1.prisma.booking.update({
            where: { id: booking.id },
            data: { razorpayOrderId: 'order_delayed' }
        });
        jest.spyOn(reconService, 'verifyPayment').mockResolvedValue(true);
        await processor.handlePaymentReconciliation({ bookingId: booking.id });
        await reconService.reconcileBooking(booking.id, 'order_delayed', 'pay_delayed', { m: 1 }, testTenantId);
        const updated = await clean_db_1.prisma.booking.findUnique({ where: { id: booking.id } });
        expect(updated?.status).toBe('CONFIRMED');
    });
    it('TEST 4: Tenant Booking Anomaly Detection', async () => {
        for (let i = 0; i < 51; i++) {
            anomalyService.trackBooking(testTenantId);
        }
        expect(anomalyService.getHealth(testTenantId).anomalyFlag).toBe(true);
    });
    it('TEST 5: Circuit Breaker Half-Open Recovery', async () => {
        const mockRazorpay = {
            orders: { create: jest.fn().mockResolvedValue({ id: 'ok' }) },
        };
        paymentService.razorpay = mockRazorpay;
        paymentService.circuitState = 1;
        paymentService.lastErrorTime = Date.now() - 130000;
        const booking = await createLockedBooking();
        await paymentService.createRazorpayOrder(booking.id, testUserId);
        expect(paymentService.circuitState).toBe(0);
    });
    it('TEST 6: Usage Reset Race Condition Safety', async () => {
        const booking = await createLockedBooking();
        await clean_db_1.prisma.tenant.update({ where: { id: testTenantId }, data: { monthlyRevenue: 1000 } });
        const originalDateNow = Date.now;
        Date.now = jest.fn(() => new Date('2026-03-01T00:00:00Z').getTime());
        await Promise.all([
            processor.handleUsageReset(),
            bookingService.confirmBookingFromRazorpay(booking.id, 'pay_race', 'sig_race', clean_db_1.prisma)
        ]);
        Date.now = originalDateNow;
        const tenant = await clean_db_1.prisma.tenant.findUnique({ where: { id: testTenantId } });
        expect(Number(tenant?.monthlyRevenue)).toBeGreaterThanOrEqual(0);
    });
});
//# sourceMappingURL=reliability-stress.e2e-spec.js.map