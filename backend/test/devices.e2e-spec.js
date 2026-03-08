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
const common_1 = require("@nestjs/common");
const supertest_1 = __importDefault(require("supertest"));
const create_test_app_1 = require("./utils/create-test-app");
const prisma_service_1 = require("./../src/prisma/prisma.service");
const qr_util_1 = require("./../src/tickets/qr.util");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const clean_db_1 = require("./utils/clean-db");
const crypto = __importStar(require("crypto"));
const bcrypt = __importStar(require("bcrypt"));
describe('Devices (e2e)', () => {
    let app;
    let prisma;
    let adminToken;
    let tenantId;
    let tenantSlug;
    let deviceId;
    let deviceKey;
    let deviceToken;
    const QR_SECRET = process.env.QR_SECRET || 'dev_secret_unsecure_override';
    beforeAll(async () => {
        await (0, clean_db_1.cleanDatabase)();
        app = await (0, create_test_app_1.createTestApp)();
        prisma = app.get(prisma_service_1.PrismaService);
        const configService = app.get(config_1.ConfigService);
        const jwtService = new jwt_1.JwtService({
            secret: configService.get('JWT_SECRET') || 'dev_secret',
        });
        tenantId = crypto.randomUUID();
        tenantSlug = `tenant-${Date.now()}`;
        await prisma.tenant.create({
            data: {
                id: tenantId,
                slug: tenantSlug,
                name: 'Test Tenant',
            },
        });
        const adminId = crypto.randomUUID();
        await prisma.user.create({
            data: {
                id: adminId,
                email: `admin-${Date.now()}@test.com`,
                password: 'hashed_pw',
                role: 'SUPER_ADMIN',
                tenantId,
            },
        });
        adminToken = jwtService.sign({ sub: adminId, role: 'SUPER_ADMIN', tenantId });
    });
    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });
    describe('Device Lifecycle', () => {
        it('should register a new device (Admin only)', async () => {
            const res = await (0, supertest_1.default)(app.getHttpServer())
                .post('/devices/register')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('x-tenant-slug', tenantSlug)
                .send({
                name: 'Main Entrance Scanner',
                tenantId,
            });
            if (res.status !== common_1.HttpStatus.CREATED) {
                console.error('Registration failed:', res.status, res.body);
            }
            expect(res.status).toBe(common_1.HttpStatus.CREATED);
            expect(res.body).toHaveProperty('deviceId');
            expect(res.body).toHaveProperty('deviceKey');
            expect(res.body.name).toBe('Main Entrance Scanner');
            deviceId = res.body.deviceId;
            deviceKey = res.body.deviceKey;
        });
        it('should authenticate device and receive short-lived JWT', async () => {
            const res = await (0, supertest_1.default)(app.getHttpServer())
                .post('/devices/authenticate')
                .set('x-tenant-slug', tenantSlug)
                .send({
                deviceId,
                deviceKey,
            });
            expect(res.status).toBe(common_1.HttpStatus.CREATED);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body.expiresIn).toBe(900);
            deviceToken = res.body.accessToken;
        });
        it('should fail authentication with wrong key', async () => {
            const res = await (0, supertest_1.default)(app.getHttpServer())
                .post('/devices/authenticate')
                .set('x-tenant-slug', tenantSlug)
                .send({
                deviceId,
                deviceKey: 'wrong-key-123456',
            });
            expect(res.status).toBe(common_1.HttpStatus.UNAUTHORIZED);
        });
    });
    describe('Scanning via Device', () => {
        let ticketId;
        let showId;
        let qrToken;
        beforeAll(async () => {
            showId = crypto.randomUUID();
            ticketId = crypto.randomUUID();
            const theaterId = crypto.randomUUID();
            const screenId = crypto.randomUUID();
            const eventId = crypto.randomUUID();
            await prisma.theater.create({ data: { id: theaterId, name: 'T', city: 'C', address: 'A', tenantId } });
            await prisma.screen.create({ data: { id: screenId, name: 'S', totalRows: 5, seatsPerRow: 5, theaterId, tenantId } });
            await prisma.event.create({ data: { id: eventId, tenantId, title: 'E', type: 'MOVIE', language: 'EN', duration: 60, date: new Date(), location: 'L', price: 10 } });
            await prisma.show.create({ data: { id: showId, eventId, screenId, startTime: new Date(), price: 10, tenantId } });
            qrToken = qr_util_1.QrUtil.generateSignedToken({
                t: ticketId,
                s: showId,
                exp: Math.floor(Date.now() / 1000) + 3600,
            }, QR_SECRET);
            await prisma.ticket.create({
                data: {
                    id: ticketId,
                    showId,
                    seatNumber: 'B2',
                    qrHash: qr_util_1.QrUtil.hashToken(qrToken),
                    status: 'ACTIVE',
                    tenantId,
                    bookingId: crypto.randomUUID(),
                }
            });
        });
        it('should scan ticket successfully using Device JWT', async () => {
            const res = await (0, supertest_1.default)(app.getHttpServer())
                .post('/tickets/scan')
                .set('Authorization', `Bearer ${deviceToken}`)
                .set('x-tenant-slug', tenantSlug)
                .send({ qrToken });
            if (res.status !== common_1.HttpStatus.CREATED) {
                console.error('Scan failed:', res.status, res.body);
            }
            expect(res.status).toBe(common_1.HttpStatus.CREATED);
            expect(res.body.status).toBe('SUCCESS');
            const device = await prisma.scannerDevice.findUnique({ where: { id: deviceId } });
            expect(device?.lastSeenAt).toBeDefined();
        });
        it('should reject scan if device is deactivated', async () => {
            await prisma.scannerDevice.update({
                where: { id: deviceId },
                data: { isActive: false }
            });
            const res = await (0, supertest_1.default)(app.getHttpServer())
                .post('/tickets/scan')
                .set('Authorization', `Bearer ${deviceToken}`)
                .set('x-tenant-slug', tenantSlug)
                .send({ qrToken });
            if (res.body.status !== 'INVALID') {
                console.error('Scan deactivation failure:', res.status, res.body);
            }
            expect(res.body.status).toBe('INVALID');
        });
    });
    describe('Offline Sync Engine', () => {
        let deviceId2;
        let deviceKey2;
        let deviceToken2;
        let showId;
        beforeAll(async () => {
            deviceId2 = crypto.randomUUID();
            deviceKey2 = 'offline-secure-key';
            await prisma.scannerDevice.create({
                data: {
                    id: deviceId2,
                    name: 'Offline Scanner',
                    deviceKey: await bcrypt.hash(deviceKey2, 10),
                    tenantId,
                    isActive: true
                }
            });
            const configService = app.get(config_1.ConfigService);
            const deviceJwtService = new jwt_1.JwtService({
                secret: configService.get('DEVICE_JWT_SECRET') || 'fallback_device_secret_please_change',
            });
            deviceToken2 = deviceJwtService.sign({ deviceId: deviceId2, tenantId, role: 'SCANNER_DEVICE' });
            showId = crypto.randomUUID();
            const theaterId = crypto.randomUUID();
            const screenId = crypto.randomUUID();
            const eventId = crypto.randomUUID();
            await prisma.theater.create({ data: { id: theaterId, name: 'T2', city: 'C2', address: 'A2', tenantId } });
            await prisma.screen.create({ data: { id: screenId, name: 'S2', totalRows: 5, seatsPerRow: 5, theaterId, tenantId } });
            await prisma.event.create({ data: { id: eventId, tenantId, title: 'E2', type: 'MOVIE', language: 'EN', duration: 60, date: new Date(), location: 'L2', price: 10 } });
            await prisma.show.create({ data: { id: showId, eventId, screenId, startTime: new Date(), price: 10, tenantId } });
        });
        it('should sync multiple offline scans (Success & Conflict cases)', async () => {
            const ticket1 = crypto.randomUUID();
            const ticket2 = crypto.randomUUID();
            const qr1 = qr_util_1.QrUtil.generateSignedToken({ t: ticket1, s: showId, exp: 9999999999 }, QR_SECRET);
            const qr2 = qr_util_1.QrUtil.generateSignedToken({ t: ticket2, s: showId, exp: 9999999999 }, QR_SECRET);
            await prisma.ticket.createMany({
                data: [
                    { id: ticket1, showId, qrHash: qr_util_1.QrUtil.hashToken(qr1), status: 'ACTIVE', tenantId, seatNumber: 'C1', bookingId: crypto.randomUUID() },
                    { id: ticket2, showId, qrHash: qr_util_1.QrUtil.hashToken(qr2), status: 'USED', tenantId, seatNumber: 'C2', bookingId: crypto.randomUUID() },
                ]
            });
            const syncPayload = {
                scans: [
                    { qrToken: qr1, scannedAt: new Date().toISOString() },
                    { qrToken: qr2, scannedAt: new Date().toISOString() },
                ]
            };
            const res = await (0, supertest_1.default)(app.getHttpServer())
                .post('/devices/sync-scans')
                .set('Authorization', `Bearer ${deviceToken2}`)
                .set('x-tenant-slug', tenantSlug)
                .send(syncPayload);
            if (res.status !== common_1.HttpStatus.CREATED) {
                console.error('Sync failed:', res.status, res.body);
            }
            expect(res.status).toBe(common_1.HttpStatus.CREATED);
            expect(res.body.results).toHaveLength(2);
            const r1 = res.body.results.find((r) => r.qrToken === qr1);
            const r2 = res.body.results.find((r) => r.qrToken === qr2);
            expect(r1.status).toBe('SUCCESS');
            expect(r2.status).toBe('CONFLICT_ALREADY_USED');
            const res2 = await (0, supertest_1.default)(app.getHttpServer())
                .post('/devices/sync-scans')
                .set('Authorization', `Bearer ${deviceToken2}`)
                .set('x-tenant-slug', tenantSlug)
                .send(syncPayload);
            expect(res2.body.results[0].status).toBe('DUPLICATE_IGNORED');
        });
        it('should block sync for other tenant tickets', async () => {
            const otherTenant = crypto.randomUUID();
            await prisma.tenant.create({ data: { id: otherTenant, slug: `other-${Date.now()}`, name: 'Other' } });
            const t3 = crypto.randomUUID();
            const qr3 = qr_util_1.QrUtil.generateSignedToken({ t: t3, s: showId, exp: 9999999999 }, QR_SECRET);
            await prisma.ticket.create({
                data: { id: t3, showId, qrHash: qr_util_1.QrUtil.hashToken(qr3), status: 'ACTIVE', tenantId: otherTenant, seatNumber: 'D1', bookingId: crypto.randomUUID() }
            });
            const res = await (0, supertest_1.default)(app.getHttpServer())
                .post('/devices/sync-scans')
                .set('Authorization', `Bearer ${deviceToken2}`)
                .set('x-tenant-slug', tenantSlug)
                .send({ scans: [{ qrToken: qr3, scannedAt: new Date().toISOString() }] });
            expect(res.body.results[0].status).toBe('WRONG_TENANT');
        });
    });
});
//# sourceMappingURL=devices.e2e-spec.js.map