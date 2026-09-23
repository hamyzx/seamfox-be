import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateUserDto } from '../user/dto/createUser.dto';
import { IResponse } from '../lib/interfaces/response.interface';
import { AuthProvider } from './auth.provider';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verifyOTP.dto';
import { SendOtpDto } from './dto/sendOTP.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { LogoutDto } from './dto/logout.dto';
import { CreateSocialLoginUserDTO } from '../user/dto/createSocialLoginUser.dto';
import { AuthGuard } from '../lib/guards/auth.guard';
import { UserProvider } from '../user/user.provider';
import { verifyUnsubscribeToken } from '../lib/helpers/unsubscribe.helper';

@Controller('auth')
export class AuthController {
  constructor(
    private authProvider: AuthProvider,
    private userProvider: UserProvider,
  ) {}

  @Post('sign-up')
  async signup(@Body() payload: CreateUserDto): Promise<IResponse> {
    await this.authProvider.signup(payload);
    return { message: 'OTP sent, please verify your account' };
  }

  @Post('social-login')
  async socialLogin(@Body() payload: CreateSocialLoginUserDTO): Promise<IResponse> {
    const data = await this.authProvider.socialSignupLogin(payload);
    return { data, message: 'Logged in successfully' };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() payload: VerifyOtpDto): Promise<IResponse> {
    const result = await this.authProvider.verifyOtp(payload);
    return { data: result, message: result.message };
  }

  @Post('send-otp')
  async sendOtp(@Body() payload: SendOtpDto): Promise<IResponse> {
    await this.authProvider.sendOtp(payload);
    return { message: 'OTP has been sent to your email' };
  }

  @Post('reset-password')
  async resetPassword(@Body() payload: ResetPasswordDto): Promise<IResponse> {
    await this.authProvider.resetPassword(payload);
    return { message: 'Password has been reset successfully' };
  }

  @Post('login')
  async login(@Body() payload: LoginDto): Promise<IResponse> {
    const { message, ...data } = await this.authProvider.login(payload);
    return { data, message: message || 'Logged in successfully' };
  }

  @Post('login-admin')
  async loginAdmin(@Body() payload: LoginDto): Promise<IResponse> {
    await this.authProvider.loginAdmin(payload);
    return { message: 'OTP sent, please verify your account' };
  }

  @Post('verify-otp-admin')
  async verifyOtpAdmin(@Body() payload: VerifyOtpDto): Promise<IResponse> {
    const { message, ...data } = await this.authProvider.verifyOtpAdminLogin(payload);
    return { data, message: message || 'Logged in successfully' };
  }

  @Post('logout')
  async logout(@Body() payload: LogoutDto): Promise<IResponse> {
    const data = await this.authProvider.logout(payload);
    return { data, message: 'Logged out successfully' };
  }

  @Post('send-phone-otp')
  async sendPhoneOtp(@Body() body: { phone: string }) {
    return {
      message: 'OTP sent',
      data: await this.authProvider.sendSignupPhoneOtp(body.phone),
    };
  }

  @Post('verify-phone-otp-signup')
  async verifyPhoneOtpSignup(
    @Body() payload: { phone: string; otp: string; userData: CreateUserDto },
  ): Promise<IResponse> {
    const data = await this.authProvider.verifyPhoneOtpAndSignup(payload);
    return { message: 'Verify otp successfully', data };
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Req() req: Request,
    @Body() body: { currentPassword: string; newPassword: string },
  ): Promise<IResponse> {
    await this.authProvider.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Post('request-support')
  @UseGuards(AuthGuard)
  async requestSupport(
    @Req() req: Request,
    @Body() body: { message: string; subject?: string },
  ): Promise<IResponse> {
    await this.authProvider.requestSupport(req.user.id, body.message, body.subject);
    return { message: 'Support request sent successfully' };
  }

  @UseGuards(AuthGuard)
  @Get('deletion-check')
  async deletionCheck(@Req() req: Request): Promise<IResponse> {
    const data = await this.authProvider.getDeletionBlockers(req.user.id);
    return { data, message: 'Deletion check completed' };
  }

  @UseGuards(AuthGuard)
  @Post('delete-account')
  async deleteAccount(@Req() req: Request, @Body() body: { password: string }) {
    if (!body?.password) {
      throw new BadRequestException('Password is required');
    }
    const data = await this.authProvider.deleteAccount(req.user.id, body.password);
    return { data, message: data.message, status: true };
  }

  @UseGuards(AuthGuard)
  @Post('delete-account-social')
  async deleteAccountSocial(
    @Req() req: Request,
    @Body() body: { socialId: string; socialType: string },
  ) {
    if (!body?.socialId || !body?.socialType) {
      throw new BadRequestException('Social verification data is required');
    }
    const data = await this.authProvider.deleteAccountSocial(
      req.user.id,
      body.socialId,
      body.socialType,
    );
    return { data, message: data.message, status: true };
  }

  @Post('unsubscribe')
  async unsubscribeFromMarketing(@Body() body: { token: string }) {
    if (!body.token) {
      throw new BadRequestException('Token is required');
    }

    let userId: string;
    try {
      const verified = verifyUnsubscribeToken(body.token);
      userId = verified.userId;
    } catch (err) {
      throw new BadRequestException('Invalid or expired unsubscribe link');
    }

    await this.userProvider.updateMarketingConsent(userId, false);

    return {
      status: true,
      message:
        "You've been unsubscribed from marketing emails. You will still receive important account-related emails like OTP codes, password resets, and application updates.",
    };
  }
}