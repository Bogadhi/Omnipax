import { IsString, IsNotEmpty, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'Entrance Scanner A' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'uuid-tenant-id' })
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;
}

export class AuthenticateDeviceDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  deviceId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  deviceKey!: string;
}

export class OfflineScanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  qrToken!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scannedAt!: string; // ISO string
}

export class SyncScansDto {
  @ApiProperty({ type: [OfflineScanDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineScanDto)
  @IsNotEmpty()
  scans!: OfflineScanDto[];
}
