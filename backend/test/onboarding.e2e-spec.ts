import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ApplicationStatus, Role } from '@prisma/client';
import { loginUser } from './utils/auth-helper';

describe('Theater Onboarding (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminId: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    let starpassTenant = await prisma.tenant.findUnique({ where: { slug: 'starpass' } });
    if (!starpassTenant) {
      starpassTenant = await prisma.tenant.create({
        data: { name: 'Starpass Default', slug: 'starpass' },
      });
    }

    const adminEmail = `onboarding-admin-${Date.now()}@example.com`;
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: 'password123',
        name: 'Super Admin',
        role: Role.SUPER_ADMIN,
        tenantId: starpassTenant.id,
      },
    });
    superAdminId = admin.id;

    // Get real token using helper
    adminToken = await loginUser(app, adminEmail, Role.SUPER_ADMIN);
  });

  afterAll(async () => {
    // Thorough cleanup of all related records
    await prisma.monetizationAudit.deleteMany({ where: { tenant: { slug: { contains: 'onboarding' } } } });
    await prisma.auditLog.deleteMany({ where: { userId: superAdminId } });
    
    // Get all users created during tests to clean their logs too
    const users = await prisma.user.findMany({ where: { email: { contains: 'onboarding' } } });
    const userIds = users.map(u => u.id);
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    }

    await (prisma.theaterApplication as any).deleteMany({ where: { email: { contains: 'onboarding' } } });
    await prisma.user.deleteMany({ where: { id: { in: [superAdminId, ...userIds] } } });
    await prisma.theater.deleteMany({ where: { name: { contains: 'Onboarding' } } });
    await prisma.tenant.deleteMany({ where: { slug: { contains: 'onboarding' } } });
    
    await app.close();
  });

  it('POST /theater/apply - should submit application successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/theater/apply')
      .send({
        theaterName: 'Onboarding Theater A',
        ownerName: 'Owner A',
        email: 'onboarding-a@example.com',
        phone: '+919999999999',
        address: '123 Main St',
        city: 'Hyderabad',
        state: 'Telangana',
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toContain('received');

    const appRecord = await (prisma.theaterApplication as any).findFirst({
      where: { email: 'onboarding-a@example.com' },
    });
    expect(appRecord).toBeDefined();
    expect(appRecord.tenantSlug).toBe('onboarding-theater-a');
  });

  it('POST /theater/apply - should block duplicate pending application', async () => {
    await request(app.getHttpServer())
      .post('/theater/apply')
      .send({
        theaterName: 'Onboarding Theater B',
        ownerName: 'Owner B',
        email: 'onboarding-b@example.com',
        phone: '+918888888888',
        address: '456 Side St',
        city: 'Mumbai',
        state: 'Maharashtra',
      });

    const duplicateResponse = await request(app.getHttpServer())
      .post('/theater/apply')
      .send({
        theaterName: 'Another Name',
        ownerName: 'Owner B',
        email: 'onboarding-b@example.com',
        phone: '+918888888888',
        address: '456 Side St',
        city: 'Mumbai',
        state: 'Maharashtra',
      });

    expect(duplicateResponse.status).toBe(409);
  });

  it('PATCH /superadmin/theater-applications/:id/review (REJECT) - should reject application', async () => {
    const appRecord = await (prisma.theaterApplication as any).create({
      data: {
        theaterName: 'Onboarding Theater C',
        tenantSlug: 'onboarding-theater-c',
        ownerName: 'Owner C',
        email: 'onboarding-c@example.com',
        phone: '+917777777777',
        address: '789 Cave St',
        city: 'Delhi',
        state: 'Delhi',
        status: ApplicationStatus.PENDING,
      },
    });

    const response = await request(app.getHttpServer())
      .patch(`/superadmin/theater-applications/${appRecord.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'REJECT',
        reviewNotes: 'Invalid documents',
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(ApplicationStatus.REJECTED);
  });

  it('PATCH /superadmin/theater-applications/:id/review (APPROVE) - should create full tenant ecosystem', async () => {
    const appRecord = await (prisma.theaterApplication as any).create({
      data: {
        theaterName: 'Onboarding Theater D',
        tenantSlug: 'onboarding-theater-d',
        ownerName: 'Owner D',
        email: 'onboarding-d@example.com',
        phone: '+916666666666',
        address: '101 Sky St',
        city: 'Bangalore',
        state: 'Karnataka',
        status: ApplicationStatus.PENDING,
      },
    });

    const response = await request(app.getHttpServer())
      .patch(`/superadmin/theater-applications/${appRecord.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'APPROVE',
        reviewNotes: 'All looks good',
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('APPROVED');

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'onboarding-theater-d' } });
    expect(tenant).toBeDefined();
    expect(tenant!.name).toBe('Onboarding Theater D');
  });
});
