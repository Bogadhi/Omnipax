"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const clean_db_1 = require("./utils/clean-db");
const create_test_app_1 = require("./utils/create-test-app");
const auth_service_1 = require("../src/auth/auth.service");
describe('Auth System (E2E)', () => {
    let app;
    let authService;
    beforeAll(async () => {
        app = await (0, create_test_app_1.createTestApp)();
        authService = app.get(auth_service_1.AuthService);
    });
    beforeEach(async () => {
        await (0, clean_db_1.cleanDatabase)();
    });
    afterAll(async () => {
        await app.close();
        await clean_db_1.prisma.$disconnect();
    });
    const email = 'test@example.com';
    describe('OTP Flow', () => {
        it('should request OTP successfully', async () => {
            const { status, body } = await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/otp/request')
                .send({ email });
            expect(status).toBe(201);
            expect(body.message).toBe('OTP sent successfully');
            const otps = authService.otps;
            expect(otps.has(email)).toBe(true);
        });
        it('should login with valid OTP and create user', async () => {
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/otp/request')
                .send({ email });
            const otps = authService.otps;
            const otp = otps.get(email);
            const { status, body } = await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/login')
                .send({ email, otp });
            expect(status).toBe(201);
            expect(body).toHaveProperty('access_token');
            expect(body.user.email).toBe(email);
            expect(body.user.role).toBe('USER');
            const user = await clean_db_1.prisma.user.findUnique({ where: { email } });
            expect(user).toBeDefined();
        });
        it('should reject invalid OTP', async () => {
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/otp/request')
                .send({ email });
            const { status } = await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/login')
                .send({ email, otp: '000000' });
            expect(status).toBe(401);
        });
    });
    describe('Role Guards', () => {
        let userToken;
        let adminToken;
        beforeEach(async () => {
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/otp/request')
                .send({ email: 'user@test.com' });
            const userOtp = authService.otps.get('user@test.com');
            const userRes = await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'user@test.com', otp: userOtp });
            userToken = userRes.body.access_token;
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/otp/request')
                .send({ email: 'admin@test.com' });
            const adminOtp = authService.otps.get('admin@test.com');
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'admin@test.com', otp: adminOtp });
            await clean_db_1.prisma.user.update({
                where: { email: 'admin@test.com' },
                data: { role: 'ADMIN' },
            });
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/otp/request')
                .send({ email: 'admin@test.com' });
            const adminOtp2 = authService.otps.get('admin@test.com');
            const adminRes = await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'admin@test.com', otp: adminOtp2 });
            adminToken = adminRes.body.access_token;
        });
        it('should allow Admin to access admin routes', async () => {
            const { status } = await (0, supertest_1.default)(app.getHttpServer())
                .get('/admin/analytics')
                .set('Authorization', `Bearer ${adminToken}`);
        });
    });
});
//# sourceMappingURL=auth.e2e-spec.js.map