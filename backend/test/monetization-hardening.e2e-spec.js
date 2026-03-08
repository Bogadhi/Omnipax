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
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const request = __importStar(require("supertest"));
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/prisma/prisma.service");
const client_1 = require("@prisma/client");
describe('Monetization Hardening (E2E)', () => {
    let app;
    let prisma;
    let tenantId;
    let userId;
    let adminToken;
    let showId;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe());
        await app.init();
        prisma = app.get(prisma_service_1.PrismaService);
        const tenant = await prisma.tenant.create({
            data: {
                slug: 'hardening-test-theater',
                name: 'Hardening Test Theater',
                platformFeeType: client_1.PlatformFeeType.PERCENTAGE,
                platformFeeValue: 10,
            },
        });
        tenantId = tenant.id;
        const user = await prisma.user.create({
            data: {
                email: `test-${Date.now()}@example.com`,
                password: 'password123',
                name: 'Test Admin',
                role: 'SUPER_ADMIN',
            },
        });
        userId = user.id;
        adminToken = 'MOCK_SUPER_ADMIN_TOKEN';
        const event = await prisma.event.create({
            data: {
                title: 'Monetization Test Event',
                description: 'Testing snapshots',
                type: 'MOVIE',
                language: 'English',
                duration: 120,
                date: new Date(),
                location: 'Main Hall',
                price: 500,
                tenantId,
            }
        });
        const theater = await prisma.theater.create({
            data: { name: 'Test Hall', city: 'Lab', address: '123 Test St', tenantId }
        });
        const screen = await prisma.screen.create({
            data: { name: 'Screen 1', totalRows: 10, seatsPerRow: 10, theaterId: theater.id }
        });
        const show = await prisma.show.create({
            data: {
                eventId: event.id,
                screenId: screen.id,
                startTime: new Date(Date.now() + 86400000),
                price: 500,
                totalCapacity: 100,
            },
        });
        showId = show.id;
    });
    afterAll(async () => {
        await prisma.bookingSeat.deleteMany({ where: { booking: { tenantId } } });
        await prisma.seatLock.deleteMany({ where: { tenantId } });
        await prisma.booking.deleteMany({ where: { tenantId } });
        await prisma.monetizationAudit.deleteMany({ where: { tenantId } });
        await prisma.show.deleteMany({ where: { id: showId } });
        await prisma.tenant.delete({ where: { id: tenantId } });
        await prisma.user.delete({ where: { id: userId } });
        await app.close();
    });
    it('should preserve monetization settings in a snapshot after seat lock', async () => {
        const lockResponse = await request(app.getHttpServer())
            .post('/seat-lock/lock')
            .send({
            showId,
            seatIds: ['A1', 'A2'],
            userId,
            tenantId,
        });
        expect(lockResponse.status).toBe(201);
        const bookingId = lockResponse.body.bookingId;
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { platformFeeValue: 20 },
        });
        const prismaBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!prismaBooking)
            throw new Error('Booking not found');
        expect(Number(prismaBooking.platformFeePercentageSnapshot)).toBe(10);
        expect(prismaBooking.platformFeeTypeSnapshot).toBe(client_1.PlatformFeeType.PERCENTAGE);
    });
    it('should enforce Model A refund policy (retain platform fee)', async () => {
        const booking = await prisma.booking.create({
            data: {
                showId,
                userId,
                tenantId,
                status: client_1.BookingStatus.CONFIRMED,
                ticketAmount: 1000,
                platformFeeAmount: 100,
                totalAmount: 1100,
                finalAmount: 1100,
                platformFeeTypeSnapshot: client_1.PlatformFeeType.PERCENTAGE,
                platformFeePercentageSnapshot: 10,
            }
        });
        const refundRes = await request(app.getHttpServer())
            .post(`/payment/refund/${booking.id}`)
            .send({ tenantId, seatsToRefund: 1 });
        expect(refundRes.status).toBe(201);
        const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
        expect(Number(updatedBooking.refundAmount)).toBe(500);
        expect(updatedBooking.refundedSeatsCount).toBe(1);
        expect(Number(updatedBooking.platformFeeAmount)).toBe(100);
    });
    it('should prevent double-refund exploits via the guard condition', async () => {
        const booking = await prisma.booking.create({
            data: {
                showId,
                userId,
                tenantId,
                status: client_1.BookingStatus.CONFIRMED,
                ticketAmount: 1000,
                platformFeeAmount: 100,
                totalAmount: 1100,
                finalAmount: 1100,
                seatsCount: 2,
            }
        });
        await request(app.getHttpServer())
            .post(`/payment/refund/${booking.id}`)
            .send({ tenantId, seatsToRefund: 2 });
        const failRes = await request(app.getHttpServer())
            .post(`/payment/refund/${booking.id}`)
            .send({ tenantId, seatsToRefund: 1 });
        expect(failRes.status).toBe(400);
        expect(failRes.body.message).toContain('Exceeds refundable');
    });
    it('should enforce hard caps (20% and ₹1000) on monetization updates', async () => {
        const capRes1 = await request(app.getHttpServer())
            .post(`/admin/tenants/${tenantId}/monetization`)
            .set('x-user-id', userId)
            .send({
            platformFeeType: client_1.PlatformFeeType.PERCENTAGE,
            platformFeePercentage: 25,
        });
        expect(capRes1.status).toBe(400);
        const capRes2 = await request(app.getHttpServer())
            .post(`/admin/tenants/${tenantId}/monetization`)
            .set('x-user-id', userId)
            .send({
            platformFeeType: client_1.PlatformFeeType.FLAT,
            platformFlatFee: 1500,
        });
        expect(capRes2.status).toBe(400);
    });
    it('should generate audit logs for every monetization change', async () => {
        const oldSettings = await prisma.tenant.findUnique({ where: { id: tenantId } });
        const changeRes = await request(app.getHttpServer())
            .post(`/admin/tenants/${tenantId}/monetization`)
            .set('x-user-id', userId)
            .send({
            platformFeeType: client_1.PlatformFeeType.FLAT,
            platformFlatFee: 50,
        });
        expect(changeRes.status).toBe(201);
        const audits = await prisma.monetizationAudit.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 1,
        });
        expect(audits.length).toBe(1);
        expect(audits[0].newFlatFee.toNumber()).toBe(50);
        expect(audits[0].oldPercentage.toNumber()).toBe(Number(oldSettings.platformFeeValue));
        expect(audits[0].changedByUserId).toBe(userId);
    });
});
//# sourceMappingURL=monetization-hardening.e2e-spec.js.map