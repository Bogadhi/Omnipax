import { IsEmail, IsString, IsOptional } from 'class-validator';

export class UserDto {
  @IsString()
  id!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  role!: string;
}
