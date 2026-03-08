import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { LoginResponse } from 'ticket-booking-shared';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { LoginPasswordDto } from './dto/login-password.dto';
import { LoginOtpDto } from './dto/login-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getOtpExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 5);
    return expiry;
  }

  async requestOtp(email: string): Promise<{ message: string }> {
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      let defaultTenant = await this.prisma.tenant.findUnique({
        where: { slug: 'starpass' },
      });

      if (!defaultTenant) {
        defaultTenant = await this.prisma.tenant.create({
          data: { name: 'Starpass Default', slug: 'starpass' }
        });
      }

      user = await this.prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          password: '',
          role: 'USER',
          isVerified: false,
          tenant: { connect: { id: defaultTenant.id } },
        },
      });
    }

    const otp = this.generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = this.getOtpExpiry();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp: hashedOtp, otpExpiry },
    });

    console.log(`OTP for ${email}: ${otp}`);
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(data: VerifyOtpDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.otp || !user.otpExpiry) throw new UnauthorizedException('Invalid OTP');
    if (new Date() > user.otpExpiry) throw new BadRequestException('OTP expired');
    
    const isOtpValid = await bcrypt.compare(data.otp, user.otp);
    if (!isOtpValid) throw new UnauthorizedException('Invalid OTP');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp: null, otpExpiry: null, isVerified: true },
    });

    return { message: 'OTP verified successfully' };
  }

  async setPassword(data: SetPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isVerified) throw new ForbiddenException('Email not verified');

    const hashedPassword = await bcrypt.hash(data.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { message: 'Password set successfully' };
  }

  async loginPassword(data: LoginPasswordDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isVerified) throw new ForbiddenException('Email not verified');

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid password');

    return this.generateJwtResponse(user);
  }

  async loginOtp(data: LoginOtpDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new NotFoundException('User not found');

    let isOtpValid = false;
    if (data.otp === '123456' && process.env.NODE_ENV !== 'production') {
      isOtpValid = true; // E2E Master OTP Bypass
    } else {
      if (!user.otp || !user.otpExpiry) throw new UnauthorizedException('Invalid OTP');
      if (new Date() > user.otpExpiry) throw new BadRequestException('OTP expired');
      isOtpValid = await bcrypt.compare(data.otp, user.otp);
    }
    
    if (!isOtpValid) throw new UnauthorizedException('Invalid OTP');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp: null, otpExpiry: null, isVerified: true },
    });

    return this.generateJwtResponse(user);
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new NotFoundException('User not found');

    const otp = this.generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = this.getOtpExpiry();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp: hashedOtp, otpExpiry },
    });

    console.log(`Password reset OTP for ${data.email}: ${otp}`);
    return { message: 'Password reset OTP sent successfully' };
  }

  async resetPassword(data: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.otp || !user.otpExpiry) throw new UnauthorizedException('Invalid OTP');
    if (new Date() > user.otpExpiry) throw new BadRequestException('OTP expired');

    const isOtpValid = await bcrypt.compare(data.otp, user.otp);
    if (!isOtpValid) throw new UnauthorizedException('Invalid OTP');

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, otp: null, otpExpiry: null, isVerified: true },
    });

    return { message: 'Password reset successfully' };
  }

  private generateJwtResponse(user: User): LoginResponse {
    const tenantId = user.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException('User is not assigned to a tenant');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: tenantId,
      theaterId: user.theaterId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? user.email.split('@')[0],
        role: user.role,
        tenantId: user.tenantId,
        theaterId: user.theaterId,
      },
    };
  }

  async validateUser(payload: { sub: string }): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: payload.sub } });
  }
}
