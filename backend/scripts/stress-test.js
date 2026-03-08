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
const axios_1 = __importDefault(require("axios"));
const jwt = __importStar(require("jsonwebtoken"));
const dotenv = __importStar(require("dotenv"));
const client_1 = require("@prisma/client");
dotenv.config();
const API_URL = 'http://localhost:5005';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const prisma = new client_1.PrismaClient();
async function runStressTest() {
    console.log('🚀 Starting API Concurrency Stress Test on port 5002...');
    try {
        const event = await prisma.event.findFirst() || await prisma.event.create({
            data: { title: 'Stress Movie', type: 'MOVIE', language: 'English', duration: 120 }
        });
        const theater = await prisma.theater.findFirst() || await prisma.theater.create({
            data: { name: 'Stress Cinema', city: 'Test City', address: '123 Stress St' }
        });
        const screen = await prisma.screen.findFirst({ where: { theaterId: theater.id } }) || await prisma.screen.create({
            data: { name: 'Screen 1', totalSeats: 100, theaterId: theater.id }
        });
        const show = await prisma.show.findFirst({ where: { eventId: event.id } }) || await prisma.show.create({
            data: { startTime: new Date(), basePrice: 200, eventId: event.id, screenId: screen.id }
        });
        const showId = show.id;
        const seatId = `S_${Math.floor(Math.random() * 1000)}`;
        console.log(`📍 Testing with Show ID: ${showId}, Seat ID: ${seatId}`);
        console.log('🔥 Preparing 20 users and tokens...');
        const users = [];
        for (let i = 0; i < 20; i++) {
            const email = `stress_${i}_${Date.now()}@test.com`;
            const user = await prisma.user.create({ data: { email, name: `Stress User ${i}` } });
            const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET);
            users.push({ id: user.id, token });
        }
        console.log('🔥 Sending 20 concurrent lock requests...');
        const lockPromises = users.map(u => axios_1.default.post(`${API_URL}/bookings/lock`, { showId, seatId }, { headers: { Authorization: `Bearer ${u.token}` } }).then(res => ({ uid: u.id, token: u.token, success: true, data: res.data }))
            .catch(err => ({ uid: u.id, token: u.token, success: false, error: err.response?.data || err.message })));
        const results = await Promise.all(lockPromises);
        const successfulLocks = results.filter((r) => r.success);
        const failedLocks = results.filter((r) => !r.success);
        console.log(`✅ Successful locks: ${successfulLocks.length}`);
        console.log(`❌ Failed locks: ${failedLocks.length}`);
        if (failedLocks.length > 0) {
            console.log('Sample Error:', failedLocks[0].error);
        }
        let testPass = true;
        if (successfulLocks.length === 1) {
            console.log('✨ PASS: Exactly one user successfully locked the seat.');
        }
        else {
            console.error(`🚨 FAIL: Concurrency violation! ${successfulLocks.length} locks granted.`);
            testPass = false;
        }
        if (successfulLocks.length === 1) {
            const winner = successfulLocks[0];
            const paymentId = `pay_${Date.now()}_unique`;
            console.log(`💳 Attempting first confirmation for user ${winner.uid}...`);
            const firstRes = await axios_1.default.post(`${API_URL}/bookings/confirm`, { showId, seatIds: [seatId], amount: 200, paymentId }, { headers: { Authorization: `Bearer ${winner.token}` } });
            console.log(`✅ First confirmation success: Status ${firstRes.data.status}`);
            console.log(`💳 Attempting duplicate confirmation...`);
            try {
                await axios_1.default.post(`${API_URL}/bookings/confirm`, { showId, seatIds: [seatId], amount: 200, paymentId }, { headers: { Authorization: `Bearer ${winner.token}` } });
                console.error('🚨 FAIL: Duplicate confirmation allowed!');
                testPass = false;
            }
            catch (err) {
                console.log(`✅ Duplicate confirmation rejected: ${err.response?.data?.message || err.message}`);
            }
        }
        else if (successfulLocks.length === 0) {
            console.error('🚨 FAIL: No one was able to lock the seat.');
            testPass = false;
        }
        console.log('\n🏁 Stress Test Completed.');
        if (testPass) {
            console.log('FINAL VERDICT: PASS');
        }
        else {
            console.log('FINAL VERDICT: FAIL');
        }
    }
    catch (err) {
        console.error('Test script crashed:', err.message);
        if (err.response)
            console.error('Response data:', err.response.data);
    }
    finally {
        await prisma.$disconnect();
    }
}
runStressTest();
//# sourceMappingURL=stress-test.js.map