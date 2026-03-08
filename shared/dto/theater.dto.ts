import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  Matches,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export enum ApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PlatformFeeType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class CreateTheaterApplicationDto {
  @IsString()
  @IsNotEmpty()
  theaterName!: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid GST Number format',
  })
  gstNumber?: string;
}

export class ReviewTheaterApplicationDto {
  @IsEnum(ReviewAction)
  @IsNotEmpty()
  action!: ReviewAction;

  @IsString()
  @IsOptional()
  reviewNotes?: string;
}

export class CreateTheaterDto {
  @IsString()
  name!: string;

  @IsString()
  city!: string;

  @IsString()
  address!: string;
}

export class UpdateMonetizationDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsEnum(PlatformFeeType)
  @IsOptional()
  type?: PlatformFeeType;

  @IsNumber()
  @Min(0)
  @Max(1000)
  @IsOptional()
  value?: number;
}

export interface ScreenDto {
  id: string;
  name: string;
  theaterId: string;
}

export interface TheaterDto {
  id: string;
  name: string;
  city: string;
  address: string;
  screens?: ScreenDto[];
}
