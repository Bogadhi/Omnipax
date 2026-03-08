import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { QrUtil } from './../src/tickets/qr.util';

describe('Tickets (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let validTicketId: string;
  let showId: string;
  let rawQrToken: string;
  let tenantId: string;
  
  const EXPIRES_IN_1H = Math.floor(Date.now() / 1000) + 3600;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Setup Test Data Environment specifically mapped to DB execution bounds
    const crypto = require('crypto');
    tenantId = crypto.randomUUID();
    validTicketId = crypto.randomUUID();
    showId = crypto.randomUUID();
    const testUserId = crypto.randomUUID();
    const mockBookingId = crypto.randomUUID();
    
    const theaterId = crypto.randomUUID();
    const screenId = crypto.randomUUID();
    const eventId = crypto.randomUUID();

    // Create base relations resolving foreign-keys
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

    const jwtProvider = app.get('JwtService'); // Assuming provided via mock or real
    token = jwtProvider.sign({ userId: testUserId, role: 'STAFF', tenantId }); // Requires matching JwtModule

    // Generate Token manually
    const secret = process.env.QR_SECRET || 'dev_secret_unsecure_override';
    
    rawQrToken = QrUtil.generateSignedToken({
       t: validTicketId,
       s: showId,
       exp: EXPIRES_IN_1H,
    }, secret);

    const hashMatch = QrUtil.hashToken(rawQrToken);

    // Seed test Ticket targeting ACTIVE states
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
       
       // Fire 3 simultaneous identical scans pretending to be network retries or 3 parallel staff
       const startTime = Date.now();
       
       const promises = [
          request(app.getHttpServer())
            .post('/tickets/scan')
            .set('Authorization', `Bearer ${token}`)
            .send(scanPayload),
          request(app.getHttpServer())
            .post('/tickets/scan')
            .set('Authorization', `Bearer ${token}`)
            .send(scanPayload),
          request(app.getHttpServer())
            .post('/tickets/scan')
            .set('Authorization', `Bearer ${token}`)
            .send(scanPayload)
       ];

       const results = await Promise.all(promises);
       
       const executionTime = Date.now() - startTime;
       // Validating thresholds cleanly map to hardware, usually takes ~20-50ms max DB
       expect(executionTime).toBeLessThan(150); 
       
       // Exactly 1 should succeed
       const successCount = results.filter((r: any) => r.body.status === 'SUCCESS').length;
       expect(successCount).toBe(1);

       // Exactly 2 must fallback to ALREADY_USED preventing race condition exploitation
       const usedCount = results.filter((r: any) => r.body.status === 'ALREADY_USED').length;
       expect(usedCount).toBe(2);
    });
  });
});
