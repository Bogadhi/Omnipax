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
const supertest_1 = __importDefault(require("supertest"));
const clean_db_1 = require("./utils/clean-db");
const create_test_app_1 = require("./utils/create-test-app");
const auth_helper_1 = require("./utils/auth-helper");
const crypto = __importStar(require("crypto"));
describe('Payment (E2E)', () => {
    let app;
    let authToken;
    beforeAll(async () => {
        app = await (0, create_test_app_1.createTestApp)();
    });
    beforeEach(async () => {
        await (0, clean_db_1.cleanDatabase)();
        authToken = await (0, auth_helper_1.loginUser)(app, 'pay@test.com');
    });
    afterAll(async () => {
        await app.close();
        await clean_db_1.prisma.$disconnect();
    });
    it('should verify valid payment signature', async () => {
        const orderId = 'order_test_123';
        const paymentId = 'pay_test_456';
        const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key';
        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(orderId + '|' + paymentId)
            .digest('hex');
        const { status, text } = await (0, supertest_1.default)(app.getHttpServer())
            .post('/payment/verify')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            orderId,
            paymentId,
            signature: generatedSignature,
        });
        expect(status).toBe(201);
        expect(text).toBe('true');
    });
    it('should reject invalid signature', async () => {
        const orderId = 'order_test_123';
        const paymentId = 'pay_test_456';
        const { status } = await (0, supertest_1.default)(app.getHttpServer())
            .post('/payment/verify')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            orderId,
            paymentId,
            signature: 'invalid_sig_here',
        });
        expect(status).toBe(400);
    });
});
//# sourceMappingURL=payment.e2e-spec.js.map