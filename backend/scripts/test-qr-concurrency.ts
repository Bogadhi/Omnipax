
import axios from 'axios';
import { PrismaClient, BookingStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:5001';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

async function runTest() {
  console.log('Starting QR Validation Concurrency Test...');

  // 1. Setup: Create a confirmed booking
  const user = await prisma.user.findFirst();
  const show = await prisma.show.findFirst({ include: { event: true } });
  
  if (!user || !show) {
    console.error('No user or show found. Run seed first.');
    process.exit(1);
  }

  // Promote user to ADMIN for test (since Strategy fetches from DB)
  const originalRole = user.role;
  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  console.log('Promoted user to ADMIN for testing.');

  // Generate valid qrToken
  const bookingId = crypto.randomUUID();
  const createdAt = new Date();
  const payload = `${bookingId}:${user.id}:${createdAt.toISOString()}`;
  const qrToken = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');

  const booking = await prisma.booking.create({
    data: {
      id: bookingId,
      userId: user.id,
      showId: show.id,
      status: BookingStatus.CONFIRMED,
      totalAmount: 100,
      paymentId: `test_pay_${Date.now()}`,
      createdAt: createdAt,
      qrToken: qrToken,
      bookingSeats: {
          create: { seatId: 'TEST_SEAT_QR_1', price: 100 }
      }
    },
  });

  console.log(`Created Booking: ${booking.id} with Token: ${qrToken}`);

  // 2. Mock Admin Token (We need a valid JWT for ADMIN)
  // For this test, we assume we can get a valid token or we skip auth if running locally?
  // The endpoint is protected. We need a token.
  // We can login as admin or sign a token if we have the secret.
  // Let's sign a fresh token.
  const jwt = require('jsonwebtoken');
  const adminToken = jwt.sign({ sub: user.id, email: user.email, role: 'ADMIN' }, JWT_SECRET);

  // 3. Launch 50 concurrent requests
  const requests = Array.from({ length: 50 }).map((_, i) => {
    return axios.post(
      `${API_URL}/validate-ticket`,
      { bookingId: booking.id, qrToken: qrToken },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    ).then(res => ({ status: res.status, data: res.data }))
     .catch(err => ({ status: err.response?.status || 500, data: err.response?.data }));
  });

  console.log('Sending 50 concurrent validation requests...');
  const results = await Promise.all(requests);

  // 4. Analyze Results
  const successes = results.filter(r => r.status === 201 || r.status === 200).length;
  const failures = results.filter(r => r.status !== 201 && r.status !== 200).length;
  const alreadyScanned = results.filter(r => r.data?.message?.includes('already scanned')).length;

  console.log(`Successes: ${successes}`);
  console.log(`Failures: ${failures}`);

  if (results.some(r => r.status !== 200 && r.status !== 201)) {
    const firstFailure = results.find(r => r.status !== 200 && r.status !== 201);
    console.log('First Failure Status:', firstFailure?.status);
    console.log('First Failure Data:', JSON.stringify(firstFailure?.data));
  }

  // Cleanup
  await prisma.bookingSeat.deleteMany({ where: { bookingId: booking.id } });
  await prisma.booking.delete({ where: { id: booking.id } });
  await prisma.user.update({ where: { id: user.id }, data: { role: originalRole } });

  if (successes === 1 && failures === 49) {
    console.log('PASS: Exact concurrency control verified.');
    process.exit(0);
  } else {
    console.error('FAIL: Race condition detected.');
    process.exit(1);
  }
}

runTest();
