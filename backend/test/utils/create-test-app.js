"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestApp = createTestApp;
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const app_module_1 = require("../../src/app.module");
const booking_gateway_1 = require("../../src/booking/booking.gateway");
async function createTestApp() {
    const mockBookingGateway = {
        emitSeatLocked: jest.fn(),
        emitSeatReleased: jest.fn(),
        emitBookingConfirmed: jest.fn(),
        server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    };
    const moduleFixture = await testing_1.Test.createTestingModule({
        imports: [app_module_1.AppModule],
    })
        .overrideProvider(booking_gateway_1.BookingGateway)
        .useValue(mockBookingGateway)
        .compile();
    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    await app.init();
    return app;
}
//# sourceMappingURL=create-test-app.js.map