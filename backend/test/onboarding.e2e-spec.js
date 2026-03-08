"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const supertest_1 = __importDefault(require("supertest"));
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/prisma/prisma.service");
const client_1 = require("@prisma/client");
const auth_helper_1 = require("./utils/auth-helper");
describe('Theater Onboarding (E2E)', () => {
    let app;
    let prisma;
    let superAdminId;
    let adminToken;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe({ transform: true, whitelist: true }));
        await app.init();
        prisma = app.get(prisma_service_1.PrismaService);
        let starpassTenant = await prisma.tenant.findUnique({ where: { slug: 'starpass' } });
        if (!starpassTenant) {
            starpassTenant = await prisma.tenant.create({
                data: { name: 'Starpass Default', slug: 'starpass' },
            });
        }
        const adminEmail = `onboarding-admin-${Date.now()}@example.com`;
        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                password: 'password123',
                name: 'Super Admin',
                role: client_1.Role.SUPER_ADMIN,
                tenantId: starpassTenant.id,
            },
        });
        superAdminId = admin.id;
        adminToken = await (0, auth_helper_1.loginUser)(app, adminEmail, client_1.Role.SUPER_ADMIN);
    });
    afterAll(async () => {
        await prisma.monetizationAudit.deleteMany({ where: { tenant: { slug: { contains: 'onboarding' } } } });
        await prisma.auditLog.deleteMany({ where: { userId: superAdminId } });
        const users = await prisma.user.findMany({ where: { email: { contains: 'onboarding' } } });
        const userIds = users.map(u => u.id);
        if (userIds.length > 0) {
            await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
        }
        await prisma.theaterApplication.deleteMany({ where: { email: { contains: 'onboarding' } } });
        await prisma.user.deleteMany({ where: { id: { in: [superAdminId, ...userIds] } } });
        await prisma.theater.deleteMany({ where: { name: { contains: 'Onboarding' } } });
        await prisma.tenant.deleteMany({ where: { slug: { contains: 'onboarding' } } });
        await app.close();
    });
    it('POST /theater/apply - should submit application successfully', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/theater/apply')
            .send({
            theaterName: 'Onboarding Theater A',
            ownerName: 'Owner A',
            email: 'onboarding-a@example.com',
            phone: '+919999999999',
            address: '123 Main St',
            city: 'Hyderabad',
            state: 'Telangana',
        });
        expect(response.status).toBe(201);
        expect(response.body.message).toContain('received');
        const appRecord = await prisma.theaterApplication.findFirst({
            where: { email: 'onboarding-a@example.com' },
        });
        expect(appRecord).toBeDefined();
        expect(appRecord.tenantSlug).toBe('onboarding-theater-a');
    });
    it('POST /theater/apply - should block duplicate pending application', async () => {
        await (0, supertest_1.default)(app.getHttpServer())
            .post('/theater/apply')
            .send({
            theaterName: 'Onboarding Theater B',
            ownerName: 'Owner B',
            email: 'onboarding-b@example.com',
            phone: '+918888888888',
            address: '456 Side St',
            city: 'Mumbai',
            state: 'Maharashtra',
        });
        const duplicateResponse = await (0, supertest_1.default)(app.getHttpServer())
            .post('/theater/apply')
            .send({
            theaterName: 'Another Name',
            ownerName: 'Owner B',
            email: 'onboarding-b@example.com',
            phone: '+918888888888',
            address: '456 Side St',
            city: 'Mumbai',
            state: 'Maharashtra',
        });
        expect(duplicateResponse.status).toBe(409);
    });
    it('PATCH /superadmin/theater-applications/:id/review (REJECT) - should reject application', async () => {
        const appRecord = await prisma.theaterApplication.create({
            data: {
                theaterName: 'Onboarding Theater C',
                tenantSlug: 'onboarding-theater-c',
                ownerName: 'Owner C',
                email: 'onboarding-c@example.com',
                phone: '+917777777777',
                address: '789 Cave St',
                city: 'Delhi',
                state: 'Delhi',
                status: client_1.ApplicationStatus.PENDING,
            },
        });
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .patch(`/superadmin/theater-applications/${appRecord.id}/review`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            action: 'REJECT',
            reviewNotes: 'Invalid documents',
        });
        expect(response.status).toBe(200);
        expect(response.body.status).toBe(client_1.ApplicationStatus.REJECTED);
    });
    it('PATCH /superadmin/theater-applications/:id/review (APPROVE) - should create full tenant ecosystem', async () => {
        const appRecord = await prisma.theaterApplication.create({
            data: {
                theaterName: 'Onboarding Theater D',
                tenantSlug: 'onboarding-theater-d',
                ownerName: 'Owner D',
                email: 'onboarding-d@example.com',
                phone: '+916666666666',
                address: '101 Sky St',
                city: 'Bangalore',
                state: 'Karnataka',
                status: client_1.ApplicationStatus.PENDING,
            },
        });
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .patch(`/superadmin/theater-applications/${appRecord.id}/review`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            action: 'APPROVE',
            reviewNotes: 'All looks good',
        });
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('APPROVED');
        const tenant = await prisma.tenant.findUnique({ where: { slug: 'onboarding-theater-d' } });
        expect(tenant).toBeDefined();
        expect(tenant.name).toBe('Onboarding Theater D');
    });
});
//# sourceMappingURL=onboarding.e2e-spec.js.map