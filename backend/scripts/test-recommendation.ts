
import axios from 'axios';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

dotenv.config();

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:5001';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

async function runTest() {
  console.log('Testing Recommendation Engine...');

  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found');
    return;
  }

  const token = jwt.sign({ sub: user.id, email: user.email, role: 'USER' }, JWT_SECRET);

  try {
    const start = Date.now();
    const res = await axios.get(`${API_URL}/recommendations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const duration = Date.now() - start;

    console.log(`Status: ${res.status}`);
    console.log(`Duration: ${duration}ms`);
    console.log('Recommendations:', res.data.length);
    if (res.data.length > 0) {
      console.log('Top Recommendation:', res.data[0].event.title, 'Score:', res.data[0].score);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Response Status:', err.response.status);
      console.error('Response Data:', JSON.stringify(err.response.data));
    }
  }
}

runTest();
