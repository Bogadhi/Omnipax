import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase, prisma } from './utils/clean-db';
import { createTestApp } from './utils/create-test-app';
import { loginUser } from './utils/auth-helper';
import * as crypto from 'crypto';

describe('Payment (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
    authToken = await loginUser(app, 'pay@test.com');
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('should verify valid payment signature', async () => {
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';
    const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key';

    // Signature = HMAC_SHA256(orderId + "|" + paymentId, secret)
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(orderId + '|' + paymentId)
      .digest('hex');

    const { status, text } = await request(app.getHttpServer())
      .post('/payment/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        orderId,
        paymentId,
        signature: generatedSignature,
      });

    expect(status).toBe(201); // @Post returns 201 by default in NestJS
    expect(text).toBe('true');
  });

  it('should reject invalid signature', async () => {
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';

    const { status } = await request(app.getHttpServer())
      .post('/payment/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        orderId,
        paymentId,
        signature: 'invalid_sig_here',
      });

    expect(status).toBe(400); // Bad Request
  });
});
