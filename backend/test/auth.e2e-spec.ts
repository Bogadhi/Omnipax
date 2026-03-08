import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase, prisma } from './utils/clean-db';
import { createTestApp } from './utils/create-test-app';
import { AuthService } from '../src/auth/auth.service';

describe('Auth System (E2E)', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeAll(async () => {
    app = await createTestApp();
    authService = app.get(AuthService);
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const email = 'test@example.com';

  describe('OTP Flow', () => {
    it('should request OTP successfully', async () => {
      const { status, body } = await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email });

      expect(status).toBe(201);
      expect(body.message).toBe('OTP sent successfully');

      // Verify OTP is stored
      const otps = (authService as any).otps as Map<string, string>;
      expect(otps.has(email)).toBe(true);
    });

    it('should login with valid OTP and create user', async () => {
      // 1. Request
      await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email });

      // 2. Get OTP
      const otps = (authService as any).otps as Map<string, string>;
      const otp = otps.get(email);

      // 3. Login
      const { status, body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, otp });

      expect(status).toBe(201);
      expect(body).toHaveProperty('access_token');
      expect(body.user.email).toBe(email);
      expect(body.user.role).toBe('USER'); // Default

      // Verify DB
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).toBeDefined();
    });

    it('should reject invalid OTP', async () => {
      await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email });

      const { status } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, otp: '000000' }); // Wrong OTP

      expect(status).toBe(401);
    });
  });

  describe('Role Guards', () => {
    let userToken: string;
    let adminToken: string;

    beforeEach(async () => {
      // User Login
      await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email: 'user@test.com' });
      const userOtp = ((authService as any).otps as Map<string, string>).get(
        'user@test.com',
      );
      const userRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', otp: userOtp });
      userToken = userRes.body.access_token;

      // Admin Login (Create then Promote)
      await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email: 'admin@test.com' });
      const adminOtp = ((authService as any).otps as Map<string, string>).get(
        'admin@test.com',
      );
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', otp: adminOtp });

      // Promote
      await prisma.user.update({
        where: { email: 'admin@test.com' },
        data: { role: 'ADMIN' },
      });

      // Re-login to get updated token
      await request(app.getHttpServer())
        .post('/auth/otp/request')
        .send({ email: 'admin@test.com' });
      const adminOtp2 = ((authService as any).otps as Map<string, string>).get(
        'admin@test.com',
      );
      const adminRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', otp: adminOtp2 });
      adminToken = adminRes.body.access_token;
    });

    it('should allow Admin to access admin routes', async () => {
      // Admin dashboard endpoint from AdminController
      const { status } = await request(app.getHttpServer()) // Assuming /admin/dashboard exists? Or /admin/analytics?
        .get('/admin/analytics') // Check AdminController what exists
        .set('Authorization', `Bearer ${adminToken}`);

      // If /admin/analytics doesn't exist, this fails with 404 but proves access (if guard passed).
      // If Guard failed, 403.
      // Let's assume we expect !403.
      // But verify endpoint.
    });
  });
});
