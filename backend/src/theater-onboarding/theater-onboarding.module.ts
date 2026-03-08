import { Module } from '@nestjs/common';
import { TheaterOnboardingController } from './theater-onboarding.controller';
import { TheaterOnboardingService } from './theater-onboarding.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TheaterOnboardingController],
  providers: [TheaterOnboardingService],
  exports: [TheaterOnboardingService],
})
export class TheaterOnboardingModule {}
