import { Body, Controller, Post, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { LoginOtpDto } from './dto/login-otp.dto';
import { LoginPasswordDto } from './dto/login-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginResponse } from 'ticket-booking-shared';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {
    console.log('[DEBUG] AuthController initialized');
  }

  @Get('health')
  health() {
    return { status: 'Auth Controller Active' };
  }

  @Post('otp/request')
  async requestOtp(@Body() data: RequestOtpDto): Promise<{ message: string }> {
    return this.authService.requestOtp(data.email);
  }

  @Post('login')
  async login(@Body() data: LoginOtpDto): Promise<LoginResponse> {
    return this.authService.loginOtp(data);
  }

  @Post('login/password')
  async loginPassword(@Body() data: LoginPasswordDto): Promise<LoginResponse> {
    return this.authService.loginPassword(data);
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() data: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(data);
  }

  @Post('reset-password')
  async resetPassword(
    @Body() data: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(data);
  }
}
