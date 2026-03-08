import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module'; // Adjust path if needed
import { BookingGateway } from '../../src/booking/booking.gateway';

export async function createTestApp(): Promise<INestApplication> {
  const mockBookingGateway = {
    emitSeatLocked: jest.fn(),
    emitSeatReleased: jest.fn(),
    emitBookingConfirmed: jest.fn(),
    server: { to: jest.fn().mockReturnThis(), emit: jest.fn() }, // Mock server object just in case
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(BookingGateway)
    .useValue(mockBookingGateway)
    .compile();

  const app = moduleFixture.createNestApplication();

  // Apply same pipes as production
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  return app;
}
