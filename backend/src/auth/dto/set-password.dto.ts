import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
