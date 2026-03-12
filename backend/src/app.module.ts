import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * Root application module
 * This module bootstraps the entire NestJS application.
 * Additional feature modules (Auth, Booking, Admin, etc.)
 * will be imported here.
 */
@Module({
  imports: [
    /**
     * Global configuration loader
     * Makes environment variables accessible via ConfigService
     */
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}