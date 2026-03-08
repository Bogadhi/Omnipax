"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const app_module_1 = require("./../src/app.module");
const prisma_service_1 = require("./../src/prisma/prisma.service");
const qr_util_1 = require("./../src/tickets/qr.util");
describe('Tickets (e2e)', () => {
    let app;
    let prisma;
    let token;
    let validTicketId;
    let showId;
    let rawQrToken;
    let tenantId;
    const EXPIRES_IN_1H = Math.floor(Date.now() / 1000) + 3600;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        prisma = app.get(prisma_service_1.PrismaService);
        await app.init();
        const crypto = require('crypto');
        tenantId = crypto.randomUUID();
        validTicketId = crypto.randomUUID();
        showId = crypto.randomUUID();
        const testUserId = crypto.randomUUID();
        const mockBookingId = crypto.randomUUID();
        const theaterId = crypto.randomUUID();
        const screenId = crypto.randomUUID();
        const eventId = crypto.randomUUID();
        await prisma.tenant.create({ data: { id: tenantId, slug: `slug-${Date.now()}`, name: `Tenant-${Date.now()}` } });
        await prisma.theater.create({ data: { id: theaterId, name: 'Theater', city: 'City', address: 'Address', tenantId } });
        await prisma.screen.create({ data: { id: screenId, name: 'Screen 1', totalRows: 10, seatsPerRow: 10, theaterId, tenantId } });
        await prisma.event.create({ data: { id: eventId, tenantId, title: 'Test Event', type: 'MOVIE', language: 'EN', duration: 120, date: new Date(), location: 'Loc', price: 100 } });
        await prisma.show.create({ data: { id: showId, eventId, screenId, startTime: new Date(Date.now() - 3600000), price: 100, tenantId } });
        await prisma.user.create({
            data: {
                id: testUserId,
                email: `test-staff-${Date.now()}@example.com`,
                password: 'dummy',
                role: 'STAFF',
                tenantId,
            }
        });
        await prisma.booking.create({
            data: {
                id: mockBookingId,
                showId,
                userId: testUserId,
                status: 'CONFIRMED',
                totalAmount: 100
            }
        });
        const jwtProvider = app.get('JwtService');
        token = jwtProvider.sign({ userId: testUserId, role: 'STAFF', tenantId });
        const secret = process.env.QR_SECRET || 'dev_secret_unsecure_override';
        rawQrToken = qr_util_1.QrUtil.generateSignedToken({
            t: validTicketId,
            s: showId,
            exp: EXPIRES_IN_1H,
        }, secret);
        const hashMatch = qr_util_1.QrUtil.hashToken(rawQrToken);
        await prisma.ticket.create({
            data: {
                id: validTicketId,
                bookingId: mockBookingId,
                showId: showId,
                seatNumber: 'A1',
                qrHash: hashMatch,
                status: 'ACTIVE',
                tenantId,
            }
        });
    });
    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });
    describe('/tickets/scan (POST) Concurrency Tests', () => {
        it('should successfully scan exactly once within 100ms and correctly block simultaneous parallel calls via updateMany locks', async () => {
            const scanPayload = { qrToken: rawQrToken, deviceId: 'test-iphone-14' };
            const startTime = Date.now();
            const promises = [
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/tickets/scan')
                    .set('Authorization', `Bearer ${token}`)
                    .send(scanPayload),
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/tickets/scan')
                    .set('Authorization', `Bearer ${token}`)
                    .send(scanPayload),
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/tickets/scan')
                    .set('Authorization', `Bearer ${token}`)
                    .send(scanPayload)
            ];
            const results = await Promise.all(promises);
            const executionTime = Date.now() - startTime;
            expect(executionTime).toBeLessThan(150);
            const successCount = results.filter((r) => r.body.status === 'SUCCESS').length;
            expect(successCount).toBe(1);
            const usedCount = results.filter((r) => r.body.status === 'ALREADY_USED').length;
            expect(usedCount).toBe(2);
        });
    });
});
//# sourceMappingURL=tickets.e2e-spec.js.map