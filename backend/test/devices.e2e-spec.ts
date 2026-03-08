import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { PrismaService } from './../src/prisma/prisma.service';
import { QrUtil } from './../src/tickets/qr.util';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DevicesModule } from './../src/devices/devices.module';
import { cleanDatabase } from './utils/clean-db';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

describe('Devices (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let tenantId: string;
  let tenantSlug: string;
  let deviceId: string;
  let deviceKey: string;
  let deviceToken: string;
  
  const QR_SECRET = process.env.QR_SECRET || 'dev_secret_unsecure_override';

  beforeAll(async () => {
    await cleanDatabase();
    app = await createTestApp();
    prisma = app.get<PrismaService>(PrismaService);
    const configService = app.get(ConfigService);
    
    // Explicitly get the global JwtService (for users/admins)
    // We'll sign manually to be 100% sure of the secret
    const jwtService = new JwtService({
      secret: configService.get('JWT_SECRET') || 'dev_secret',
    });

    // Setup Tenant and Admin
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
      const res = await request(app.getHttpServer())
        .post('/devices/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-slug', tenantSlug)
        .send({
          name: 'Main Entrance Scanner',
          tenantId,
        });

      if (res.status !== HttpStatus.CREATED) {
        console.error('Registration failed:', res.status, res.body);
      }
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.body).toHaveProperty('deviceId');
      expect(res.body).toHaveProperty('deviceKey');
      expect(res.body.name).toBe('Main Entrance Scanner');
      
      deviceId = res.body.deviceId;
      deviceKey = res.body.deviceKey;
    });

    it('should authenticate device and receive short-lived JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/devices/authenticate')
        .set('x-tenant-slug', tenantSlug)
        .send({
          deviceId,
          deviceKey,
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.expiresIn).toBe(900);
      
      deviceToken = res.body.accessToken;
    });

    it('should fail authentication with wrong key', async () => {
      const res = await request(app.getHttpServer())
        .post('/devices/authenticate')
        .set('x-tenant-slug', tenantSlug)
        .send({
          deviceId,
          deviceKey: 'wrong-key-123456',
        });

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Scanning via Device', () => {
    let ticketId: string;
    let showId: string;
    let qrToken: string;

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
      
      qrToken = QrUtil.generateSignedToken({
        t: ticketId,
        s: showId,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }, QR_SECRET);

      await prisma.ticket.create({
        data: {
          id: ticketId,
          showId,
          seatNumber: 'B2',
          qrHash: QrUtil.hashToken(qrToken),
          status: 'ACTIVE',
          tenantId,
          bookingId: crypto.randomUUID(),
        }
      });
    });

    it('should scan ticket successfully using Device JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/tickets/scan')
        .set('Authorization', `Bearer ${deviceToken}`)
        .set('x-tenant-slug', tenantSlug)
        .send({ qrToken });

      if (res.status !== HttpStatus.CREATED) {
        console.error('Scan failed:', res.status, res.body);
      }
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.body.status).toBe('SUCCESS');
      
      const device = await prisma.scannerDevice.findUnique({ where: { id: deviceId } });
      expect(device?.lastSeenAt).toBeDefined();
    });

    it('should reject scan if device is deactivated', async () => {
      await prisma.scannerDevice.update({
        where: { id: deviceId },
        data: { isActive: false }
      });

      const res = await request(app.getHttpServer())
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
    let deviceId2: string;
    let deviceKey2: string;
    let deviceToken2: string;
    let showId: string;

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

      const configService = app.get(ConfigService);
      const deviceJwtService = new JwtService({
        secret: configService.get('DEVICE_JWT_SECRET') || 'fallback_device_secret_please_change',
      });
      deviceToken2 = deviceJwtService.sign({ deviceId: deviceId2, tenantId, role: 'SCANNER_DEVICE' });

      showId = crypto.randomUUID();
      // Use existing setup from previous block if possible, or create localized show
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
      
      const qr1 = QrUtil.generateSignedToken({ t: ticket1, s: showId, exp: 9999999999 }, QR_SECRET);
      const qr2 = QrUtil.generateSignedToken({ t: ticket2, s: showId, exp: 9999999999 }, QR_SECRET);

      await prisma.ticket.createMany({
        data: [
          { id: ticket1, showId, qrHash: QrUtil.hashToken(qr1), status: 'ACTIVE', tenantId, seatNumber: 'C1', bookingId: crypto.randomUUID() },
          { id: ticket2, showId, qrHash: QrUtil.hashToken(qr2), status: 'USED', tenantId, seatNumber: 'C2', bookingId: crypto.randomUUID() },
        ]
      });

      const syncPayload = {
        scans: [
          { qrToken: qr1, scannedAt: new Date().toISOString() },
          { qrToken: qr2, scannedAt: new Date().toISOString() },
        ]
      };

      const res = await request(app.getHttpServer())
        .post('/devices/sync-scans')
        .set('Authorization', `Bearer ${deviceToken2}`)
        .set('x-tenant-slug', tenantSlug)
        .send(syncPayload);

      if (res.status !== HttpStatus.CREATED) {
        console.error('Sync failed:', res.status, res.body);
      }
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.body.results).toHaveLength(2);
      
      const r1 = res.body.results.find((r: any) => r.qrToken === qr1);
      const r2 = res.body.results.find((r: any) => r.qrToken === qr2);

      expect(r1.status).toBe('SUCCESS');
      expect(r2.status).toBe('CONFLICT_ALREADY_USED');

      const res2 = await request(app.getHttpServer())
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
       const qr3 = QrUtil.generateSignedToken({ t: t3, s: showId, exp: 9999999999 }, QR_SECRET);
       await prisma.ticket.create({ 
         data: { id: t3, showId, qrHash: QrUtil.hashToken(qr3), status: 'ACTIVE', tenantId: otherTenant, seatNumber: 'D1', bookingId: crypto.randomUUID() }
       });

       const res = await request(app.getHttpServer())
         .post('/devices/sync-scans')
         .set('Authorization', `Bearer ${deviceToken2}`)
         .set('x-tenant-slug', tenantSlug)
         .send({ scans: [{ qrToken: qr3, scannedAt: new Date().toISOString() }] });

       expect(res.body.results[0].status).toBe('WRONG_TENANT');
    });
  });
});
