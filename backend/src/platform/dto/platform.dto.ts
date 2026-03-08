import { IsString, IsEnum, IsOptional, IsEmail, IsInt, Min } from 'class-validator';
import { TenantPlan, TenantStatus } from 'ticket-booking-shared';

export class UpdateTenantStatusDto {
  @IsEnum(TenantStatus)
  status!: TenantStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateTenantPlanDto {
  @IsEnum(TenantPlan)
  plan!: TenantPlan;

  @IsInt()
  @Min(0)
  @IsOptional()
  bookingLimit?: number;
}

export class UpdateTenantBillingDto {
  @IsEmail()
  billingEmail!: string;
}
