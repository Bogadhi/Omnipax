import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const API_URL = 'http://localhost:5005';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const prisma = new PrismaClient();

async function runStressTest() {
  console.log('🚀 Starting API Concurrency Stress Test on port 5002...');

  try {
    // 1. Setup Data
    const event = (await prisma.event.findFirst() as any) || await prisma.event.create({
      data: { title: 'Stress Movie', type: 'MOVIE', language: 'English', duration: 120 } as any
    });

    const theater = (await prisma.theater.findFirst() as any) || await prisma.theater.create({
      data: { name: 'Stress Cinema', city: 'Test City', address: '123 Stress St' } as any
    });

    const screen = (await prisma.screen.findFirst({ where: { theaterId: theater.id } } as any) as any) || await prisma.screen.create({
      data: { name: 'Screen 1', totalSeats: 100, theaterId: theater.id } as any
    });

    const show = (await prisma.show.findFirst({ where: { eventId: event.id } } as any) as any) || await prisma.show.create({
      data: { startTime: new Date(), basePrice: 200, eventId: event.id, screenId: screen.id } as any
    });

    const showId = show.id;
    const seatId = `S_${Math.floor(Math.random() * 1000)}`; 

    console.log(`📍 Testing with Show ID: ${showId}, Seat ID: ${seatId}`);

    // 2. Prepare 20 Users and Tokens
    console.log('🔥 Preparing 20 users and tokens...');
    const users = [];
    for (let i = 0; i < 20; i++) {
        const email = `stress_${i}_${Date.now()}@test.com`;
        const user = await prisma.user.create({ data: { email, name: `Stress User ${i}` } as any }) as any;
        const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET);
        users.push({ id: user.id, token });
    }

    // 3. Concurrent Lock Requests
    console.log('🔥 Sending 20 concurrent lock requests...');
    const lockPromises = users.map(u => 
        axios.post(`${API_URL}/bookings/lock`, 
            { showId, seatId },
            { headers: { Authorization: `Bearer ${u.token}` } }
        ).then(res => ({ uid: u.id, token: u.token, success: true, data: res.data }))
         .catch(err => ({ uid: u.id, token: u.token, success: false, error: err.response?.data || err.message }))
    );

    const results = await Promise.all(lockPromises);

    const successfulLocks = results.filter((r: any) => r.success);
    const failedLocks = results.filter((r: any) => !r.success);

    console.log(`✅ Successful locks: ${successfulLocks.length}`);
    console.log(`❌ Failed locks: ${failedLocks.length}`);

    if (failedLocks.length > 0) {
        console.log('Sample Error:', (failedLocks[0] as any).error);
    }

    let testPass = true;

    if (successfulLocks.length === 1) {
      console.log('✨ PASS: Exactly one user successfully locked the seat.');
    } else {
      console.error(`🚨 FAIL: Concurrency violation! ${successfulLocks.length} locks granted.`);
      testPass = false;
    }

    if (successfulLocks.length === 1) {
      const winner = successfulLocks[0] as any;
      const paymentId = `pay_${Date.now()}_unique`;
      
      console.log(`💳 Attempting first confirmation for user ${winner.uid}...`);
      const firstRes = await axios.post(`${API_URL}/bookings/confirm`,
        { showId, seatIds: [seatId], amount: 200, paymentId },
        { headers: { Authorization: `Bearer ${winner.token}` } }
      );
      console.log(`✅ First confirmation success: Status ${firstRes.data.status}`);

      console.log(`💳 Attempting duplicate confirmation...`);
      try {
        await axios.post(`${API_URL}/bookings/confirm`,
          { showId, seatIds: [seatId], amount: 200, paymentId },
          { headers: { Authorization: `Bearer ${winner.token}` } }
        );
        console.error('🚨 FAIL: Duplicate confirmation allowed!');
        testPass = false;
      } catch (err: any) {
        console.log(`✅ Duplicate confirmation rejected: ${err.response?.data?.message || err.message}`);
      }
    } else if (successfulLocks.length === 0) {
      console.error('🚨 FAIL: No one was able to lock the seat.');
      testPass = false;
    }

    console.log('\n🏁 Stress Test Completed.');
    if (testPass) {
        console.log('FINAL VERDICT: PASS');
    } else {
        console.log('FINAL VERDICT: FAIL');
    }

  } catch (err: any) {
    console.error('Test script crashed:', err.message);
    if (err.response) console.error('Response data:', err.response.data);
  } finally {
    await prisma.$disconnect();
  }
}

runStressTest();
