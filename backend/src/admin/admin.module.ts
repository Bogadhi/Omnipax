import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { TenantsController } from './tenants.controller';
import { AdminService } from './admin.service';
import { PricingModule } from '../pricing/pricing.module';
import { AdminGateway } from './admin.gateway';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PricingModule, forwardRef(() => AuthModule), ConfigModule, forwardRef(() => PaymentModule)],
  controllers: [AdminController, TenantsController],
  providers: [AdminService, AdminGateway],
  exports: [AdminService, AdminGateway],
})
export class AdminModule {}
