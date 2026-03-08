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
const client_1 = require("@prisma/client");
const crypto = __importStar(require("crypto"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const prisma = new client_1.PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:5001';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
async function runTest() {
    console.log('Starting QR Validation Concurrency Test...');
    const user = await prisma.user.findFirst();
    const show = await prisma.show.findFirst({ include: { event: true } });
    if (!user || !show) {
        console.error('No user or show found. Run seed first.');
        process.exit(1);
    }
    const originalRole = user.role;
    await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    console.log('Promoted user to ADMIN for testing.');
    const bookingId = crypto.randomUUID();
    const createdAt = new Date();
    const payload = `${bookingId}:${user.id}:${createdAt.toISOString()}`;
    const qrToken = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
    const booking = await prisma.booking.create({
        data: {
            id: bookingId,
            userId: user.id,
            showId: show.id,
            status: client_1.BookingStatus.CONFIRMED,
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
    const jwt = require('jsonwebtoken');
    const adminToken = jwt.sign({ sub: user.id, email: user.email, role: 'ADMIN' }, JWT_SECRET);
    const requests = Array.from({ length: 50 }).map((_, i) => {
        return axios_1.default.post(`${API_URL}/validate-ticket`, { bookingId: booking.id, qrToken: qrToken }, { headers: { Authorization: `Bearer ${adminToken}` } }).then(res => ({ status: res.status, data: res.data }))
            .catch(err => ({ status: err.response?.status || 500, data: err.response?.data }));
    });
    console.log('Sending 50 concurrent validation requests...');
    const results = await Promise.all(requests);
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
    await prisma.bookingSeat.deleteMany({ where: { bookingId: booking.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
    await prisma.user.update({ where: { id: user.id }, data: { role: originalRole } });
    if (successes === 1 && failures === 49) {
        console.log('PASS: Exact concurrency control verified.');
        process.exit(0);
    }
    else {
        console.error('FAIL: Race condition detected.');
        process.exit(1);
    }
}
runTest();
//# sourceMappingURL=test-qr-concurrency.js.map