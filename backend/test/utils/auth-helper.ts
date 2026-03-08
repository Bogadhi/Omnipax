import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthService } from '../../src/auth/auth.service';

export async function loginUser(
  app: INestApplication,
  email: string,
  role: string = 'USER',
): Promise<string> {
  // 1. Request OTP
  await request(app.getHttpServer()).post('/auth/otp/request').send({ email });

  // 2. Get OTP from AuthService (reflected access)
  const authService = app.get(AuthService);
  const otps = (authService as any).otps as Map<string, string>;
  const otp = otps.get(email);

  if (!otp) {
    throw new Error(`OTP not found for ${email}`);
  }

  // 3. Login
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, otp });

  if (res.status !== 201 && res.status !== 200) {
    throw new Error(
      `Failed to login: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }

  // If role needs to be enforced and login created a default USER, we might need to update logic
  // But AuthService login creates user if not exists.
  // The default role is likely USER (from Prisma schema default).
  // If we need ADMIN, we must update DB directly after login (as seen in auth.e2e-spec.ts).

  return res.body.access_token;
}
