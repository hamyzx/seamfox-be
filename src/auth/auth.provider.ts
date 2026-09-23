import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from '../user/dto/createUser.dto';
import { BadRequestHandler, NotFoundHandler } from '../lib/helpers/responseHandlers';
import { AuthService } from './auth.service';
import { UserProvider } from '../user/user.provider';
import { LoginDto } from './dto/login.dto';
import { IAccessToken } from '../lib/interfaces/index.interface';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { OTP_EXPIRE_IN_MS } from '../lib/constants/otp';
import { SendOtpDto } from './dto/sendOTP.dto';
import { generateOtp } from '../lib/helpers/generateOTP';
import { EmailService } from '../services/mail.service';
import { User } from '../user/entities/user.entity';
import { VerifyOtpDto } from './dto/verifyOTP.dto';
import { SocialTypes, UserRoles, UserStatus } from '../lib/enums/user.enum';
import { OTPType } from '../lib/enums/otp.enum';
import { OTP } from './entities/otp.entity';
import { MediaProvider } from '../media/media.provider';
import { FolderNames } from '../lib/enums/media.enum';
import { LogoutDto } from './dto/logout.dto';
import { NotificationProvider } from '../notification/notification.provider';
import { FcmToken } from '../notification/entities/fcmToken.entity';
import { OtpRepository } from './repository/otp.repository';
import { LoginActivityRepository } from './repository/login-activity.repository';
import { getOTPTemplate, getOtpText } from '../lib/templates/otp.template';
import { getMinFromMs } from '../lib/helpers/getMinFromMs';
import { CreateSocialLoginUserDTO } from '../user/dto/createSocialLoginUser.dto';
import { OTPPhoneRepository } from './repository/otp-phone.repository';
import { TwilioService } from '../twilio/twilio.service';
import { formatStatus } from '../lib/helpers/formatStatus';
import { CandidateStatus } from '../lib/enums/candidate.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../job/entities/job.entity';

import {
  getPasswordChangedTemplate,
  getPasswordChangedText,
} from '../lib/templates/onboarding.template';
@Injectable()
export class AuthProvider {
  constructor(
    private authService: AuthService,
    private userProvider: UserProvider,
    private emailService: EmailService,
    private notificationProvider: NotificationProvider,
    private mediaProvider: MediaProvider,
    private otpRepository: OtpRepository,
    private otpPhoneRepository: OTPPhoneRepository,
    private loginActivyRepository: LoginActivityRepository,
    private twilioService: TwilioService,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) { }

  /**
   * Fire-and-forget email — response ko block nahi karta.
   * Slow SMTP login/social flow ko hang nahi karega (502 ki ek wajah thi).
   */
  private sendEmailSafe(args: Parameters<EmailService['send']>[0]): void {
    void this.emailService.send(args).catch((err) => {
      console.warn('[AuthProvider] email send failed:', (err as any)?.message || err);
    });
  }

  async signup(payload: CreateUserDto) {
    const user = await this.userProvider.createUser({
      ...payload,
      status: UserStatus.NOT_VERIFIED,
    });

    const generatedOTP = generateOtp(6);
    await this.otpRepository.createOtp({
      code: generatedOTP,
      createdBy: user.id,
      type: OTPType.VERIFICATION,
    });

    this.sendEmailSafe({
      to: payload.email,
      subject: 'Verify your account',
      text: getOtpText({ otp: generatedOTP, otpValidation: getMinFromMs(OTP_EXPIRE_IN_MS) }),
      html: getOTPTemplate({ otp: generatedOTP, otpValidation: getMinFromMs(OTP_EXPIRE_IN_MS) }),
    });

    return user;
  }

  async verifyOtp(payload: VerifyOtpDto) {
    const { email, code, type } = payload;

    const user = (await this.userProvider.findOneByEmailOrUsername(email)) as User;
    NotFoundHandler({
      condition: !user,
      message:
        "We couldn't find an account linked to this email. Please double-check and try again.",
    });

    const storedOtp = await this.otpRepository.findOtpByUserAndCode(user.id, code, type);
    NotFoundHandler({
      condition: !storedOtp,
      message: 'The OTP you entered is incorrect. Please try again.',
    });

    BadRequestHandler({
      condition: storedOtp?.consumedAt !== null,
      message: 'This OTP has already been used. Please request a new one.',
    });

    const now = new Date();
    const createdAt = storedOtp ? new Date(storedOtp.createdAt) : new Date();
    const isExpired = now.getTime() - createdAt.getTime() > OTP_EXPIRE_IN_MS;
    BadRequestHandler({
      condition: isExpired,
      message: 'Your OTP has expired. Please request a new code to continue.',
    });

    await this.userProvider.updateUserActiveStatus(user.id);

    // ---- FORGOT PASSWORD: OTP consume karo + short-lived resetToken do ----
    if (type === OTPType.FORGOT_PASSWORD) {
      await this.otpRepository.markOtpAsConsumed(storedOtp!.id);

      const resetToken = await this.authService.generateResetToken({
        id: user.id,
        email: user.email,
        purpose: 'PASSWORD_RESET',
      });

      return {
        resetToken,
        message: 'OTP verified successfully. You can now reset your password.',
      };
    }

    // ---- VERIFICATION (signup): token do, seedha onboarding ----
    if (type === OTPType.VERIFICATION) {
      const freshUser = (await this.userProvider.findOneByEmailOrUsername(email)) as User;

      const tokenPayload: IAccessToken = {
        id: freshUser.id,
        email: freshUser.email,
        status: freshUser.status,
        role: freshUser.role,
        socialType: freshUser.socialType || null,
        ...(freshUser.candidate ? { candidateId: freshUser.candidate.id } : {}),
        ...(freshUser.company ? { companyId: freshUser.company.id } : {}),
      };

      const accessToken = await this.authService.generateToken(tokenPayload);
      const { password: _, ...userWithoutPassword } = freshUser;

      return {
        accessToken,
        ...userWithoutPassword,
        message: 'Your email has been successfully verified. You can now continue.',
      };
    }

    return { message: 'Your email has been successfully verified. You can now continue.' };
  }

  async sendOtp(payload: SendOtpDto) {
    const { email, type } = payload;
    const user = (await this.userProvider.findOneByEmailOrUsername(email)) as User;
    NotFoundHandler({ condition: !user, message: 'User not found' });

    const generatedOTP = generateOtp(6);
    await this.otpRepository.createOtp({ code: Number(generatedOTP), createdBy: user.id, type });

    this.sendEmailSafe({
      to: email,
      subject: 'Verify your account',
      text: getOtpText({ otp: generatedOTP, otpValidation: getMinFromMs(OTP_EXPIRE_IN_MS) }),
      html: getOTPTemplate({ otp: generatedOTP, otpValidation: getMinFromMs(OTP_EXPIRE_IN_MS) }),
    });

    return { message: 'OTP sent successfully' };
  }

  async resetPassword(payload: ResetPasswordDto) {
    const { email, resetToken, password } = payload;

    const decoded = await this.authService.verifyResetToken(resetToken);

    BadRequestHandler({
      condition: !decoded || decoded.purpose !== 'PASSWORD_RESET' || decoded.email !== email,
      message: 'Invalid or expired reset session. Please verify your OTP again.',
    });

    const user = (await this.userProvider.findOneByEmailOrUsername(email)) as User;
    NotFoundHandler({ condition: !user, message: 'User not found' });

    const isPasswordMatched = await this.userProvider.isPasswordMatched(password, user.password!);
    BadRequestHandler({
      condition: isPasswordMatched,
      message: 'New password cannot be same as old password',
    });

    const hashedPassword = await this.userProvider.getHashedPassword(password);
    user.password = hashedPassword;
    user.profileImg = undefined;

    await this.userProvider.updateUser(user.id, user);

    const firstName =
      (user as any).firstName || (user as any).candidate?.firstName || user.username || 'there';
    const dateTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Karachi',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    this.sendEmailSafe({
      to: user.email,
      subject: 'Your Seamfox password has been reset',
      html: getPasswordChangedTemplate({ firstName, dateTime }),
      text: getPasswordChangedText({ firstName, dateTime }),
    });

    return { message: 'Password has been reset successfully' };
  }

  async login(payload: LoginDto) {
    const { email, password, fcmToken, role } = payload;

    const user = (await this.userProvider.findOneByEmailOrUsername(email)) as User;
    if (!user) {
      throw new NotFoundException(
        "We couldn't find an account associated with this email or username.",
      );
    }

    if (role)
      BadRequestHandler({
        condition: user.role !== role,
        message: 'You are not authorized to log in with this user role.',
      });

    const isPasswordValid = await this.userProvider.isPasswordMatched(password, user.password!);
    BadRequestHandler({ condition: !isPasswordValid, message: 'Incorrect password. Please try again.' });

    const { password: _, ...userWithoutPassword } = user;

    if (this.authService.isInactive(user.status))
      throw new BadRequestException('Your account is inactive. Please contact support.');
    if (this.authService.isBanned(user.status)) this.authService.handleBannedUserCase();

    if (user.role === UserRoles.COMPANY && user?.company) {
      if (this.authService.isCompanyInactive(user.company?.status)) {
        throw new BadRequestException(
          `Your account is ${formatStatus(user.company.status)}. Please contact support.`,
        );
      }
    }

    if (user.role === UserRoles.CANDIDATE && user?.candidate) {
      if (this.authService.isCandidateBlocked(user.candidate?.status)) {
        throw new BadRequestException(
          `Your account is ${formatStatus(user.candidate.status)}. Please contact support.`,
        );
      }
    }

    if (this.authService.isNotVerified(user.status)) {
      const generatedOTP = generateOtp(6);
      await this.otpRepository.createOtp({
        code: Number(generatedOTP),
        createdBy: user.id,
        type: OTPType.VERIFICATION,
      });
      this.sendEmailSafe({
        to: email,
        subject: 'Verify your account',
        text: getOtpText({ otp: generatedOTP, otpValidation: getMinFromMs(OTP_EXPIRE_IN_MS) }),
        html: getOTPTemplate({ otp: generatedOTP, otpValidation: getMinFromMs(OTP_EXPIRE_IN_MS) }),
      });
      return {
        ...userWithoutPassword,
        needsVerification: true,
        message: "Your account is not verified. We've sent a verification code to your email.",
      };
    }

    const tokenPayload: IAccessToken = {
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role,
      socialType: user.socialType || null,
      ...(user.candidate ? { candidateId: user.candidate.id } : {}),
      ...(user.company ? { companyId: user.company.id } : {}),
    };

    const accessToken = await this.authService.generateToken(tokenPayload);
    void this.loginActivyRepository.createLog(user);
    if (fcmToken)
      void this.notificationProvider.createFCMToken({ createdBy: user.id, fcmToken });

    // REQUEST_CHANGE (Changes Requested) candidate login kar sakta hai taake profile
    // update/resubmit kare. REJECTED ab permanent hai (isCandidateBlocked se pehle hi block).
    const isRequestChange =
      user.role === UserRoles.CANDIDATE &&
      user?.candidate?.status === CandidateStatus.REQUEST_CHANGE;

    return {
      accessToken,
      ...userWithoutPassword,
      ...(isRequestChange
        ? {
          needsResubmission: true,
          message: 'Your profile needs changes. Please update your profile and resubmit.',
        }
        : { message: 'Logged in successfully' }),
    };
  }

  async loginAdmin(payload: LoginDto) {
    const { email, password } = payload;

    const user = (await this.userProvider.findOneByEmailOrUsername(email)) as User;
    if (!user) {
      throw new NotFoundException(
        "We couldn't find an account associated with this email or username.",
      );
    }

    if (payload.role)
      BadRequestHandler({
        condition: user.role !== payload.role,
        message: 'You are not authorized to log in with this user role.',
      });

    const isPasswordValid = await this.userProvider.isPasswordMatched(password, user.password!);
    BadRequestHandler({ condition: !isPasswordValid, message: 'Incorrect password. Please try again.' });

    const { password: _, ...userWithoutPassword } = user;

    if (this.authService.isInactive(user.status))
      throw new BadRequestException('Your account is inactive. Please contact support.');

    if (user.role === UserRoles.COMPANY && user?.company) {
      if (this.authService.isCompanyInactive(user.company?.status)) {
        throw new BadRequestException(
          `Your account is ${formatStatus(user.company.status)}. Please contact support.`,
        );
      }
    }

    if (user.role === UserRoles.CANDIDATE && user?.candidate) {
      if (this.authService.isCandidateBlocked(user.candidate?.status)) {
        throw new BadRequestException(
          `Your account is ${formatStatus(user.candidate.status)}. Please contact support.`,
        );
      }
    }

    if (this.authService.isNotVerified(user.status)) {
      const generatedOTP = generateOtp(6);
      await this.otpRepository.createOtp({
        code: Number(generatedOTP),
        createdBy: user.id,
        type: OTPType.VERIFICATION,
      });
      this.sendEmailSafe({
        to: email,
        subject: 'Verify your account',
        text: getOtpText({ otp: generatedOTP, otpValidation: getMinFromMs(OTP_EXPIRE_IN_MS) }),
        html: getOTPTemplate({ otp: generatedOTP, otpValidation: getMinFromMs(OTP_EXPIRE_IN_MS) }),
      });
      return {
        ...userWithoutPassword,
        needsVerification: true,
        message: "Your account is not verified. We've sent a verification code to your email.",
      };
    }

    const generatedOTP = generateOtp(6);
    await this.otpRepository.createOtp({
      code: generatedOTP,
      createdBy: user.id,
      type: OTPType.VERIFICATION,
    });
    this.sendEmailSafe({
      to: payload.email,
      subject: 'Verify your account',
      text: getOtpText({ otp: generatedOTP, otpValidation: getMinFromMs(OTP_EXPIRE_IN_MS) }),
      html: getOTPTemplate({ otp: generatedOTP, otpValidation: getMinFromMs(OTP_EXPIRE_IN_MS) }),
    });

    return user;
  }

  async verifyOtpAdminLogin(payload: VerifyOtpDto) {
    const { email, code, type, fcmToken } = payload;

    const user = (await this.userProvider.findOneByEmailOrUsername(email)) as User;
    NotFoundHandler({
      condition: !user,
      message:
        "We couldn't find an account linked to this email. Please double-check and try again.",
    });

    const storedOtp = await this.otpRepository.findOtpByUserAndCode(user.id, code, type);
    NotFoundHandler({
      condition: !storedOtp,
      message: 'The OTP you entered is incorrect. Please try again.',
    });
    BadRequestHandler({
      condition: storedOtp?.consumedAt !== null,
      message: 'This OTP has already been used. Please request a new one.',
    });

    const now = new Date();
    const createdAt = storedOtp ? new Date(storedOtp.createdAt) : new Date();
    const isExpired = now.getTime() - createdAt.getTime() > OTP_EXPIRE_IN_MS;
    BadRequestHandler({
      condition: isExpired,
      message: 'Your OTP has expired. Please request a new code to continue.',
    });

    await this.userProvider.updateUserActiveStatus(user.id);

    const { password: _, ...userWithoutPassword } = user;

    const tokenPayload: IAccessToken = {
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role,
      socialType: user.socialType || null,
      ...(user.candidate ? { candidateId: user.candidate.id } : {}),
      ...(user.company ? { companyId: user.company.id } : {}),
    };

    const accessToken = await this.authService.generateToken(tokenPayload);
    void this.loginActivyRepository.createLog(user);
    if (fcmToken)
      void this.notificationProvider.createFCMToken({ createdBy: user.id, fcmToken });

    return { accessToken, ...userWithoutPassword, message: 'Logged in successfully' };
  }

  async logout(payload: LogoutDto) {
    const { fcmToken } = payload;
    const token = (await this.notificationProvider.getTokenByFcmToken(fcmToken)) as FcmToken;
    BadRequestHandler({ condition: !token, message: 'Invalid Token' });
    await this.notificationProvider.deleteToken(fcmToken);
    return null;
  }

  async socialGetUser(fcmToken: string, user: User) {
    const freshUser = await this.userProvider.findOneWithAllAuthRelations(user.id);
    if (!freshUser) throw new BadRequestException('User not found after social login');
    user = freshUser;

    if (user.role === UserRoles.COMPANY && user?.company) {
      if (this.authService.isCompanyInactive(user.company?.status)) {
        throw new BadRequestException(
          `Your account is ${formatStatus(user.company.status)}. Please contact support.`,
        );
      }
    }

    if (user.role === UserRoles.CANDIDATE && user?.candidate) {
      if (this.authService.isCandidateBlocked(user.candidate?.status)) {
        throw new BadRequestException(
          `Your account is ${formatStatus(user.candidate.status)}. Please contact support.`,
        );
      }
    }

    if (this.authService.isInactive(user.status))
      throw new BadRequestException('Your account is inactive. Please contact support.');
    if (this.authService.isBanned(user.status)) this.authService.handleBannedUserCase();

    const tokenPayload: IAccessToken = {
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role,
      socialType: user.socialType || null,
      ...(user.candidate ? { candidateId: user.candidate.id } : {}),
      ...(user.company ? { companyId: user.company.id } : {}),
    };

    const accessToken = await this.authService.generateToken(tokenPayload);
    void this.loginActivyRepository.createLog(user);

    if (fcmToken) {
      void this.notificationProvider.createFCMToken({
        createdBy: user.id as unknown as string,
        fcmToken,
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    // REQUEST_CHANGE (Changes Requested) -> login allow + resubmit message.
    // REJECTED ab permanent hai -> upar isCandidateBlocked se pehle hi block ho gaya.
    const isRequestChange =
      user.role === UserRoles.CANDIDATE &&
      user?.candidate?.status === CandidateStatus.REQUEST_CHANGE;

    return {
      accessToken,
      ...userWithoutPassword,
      ...(isRequestChange
        ? {
          needsResubmission: true,
          message: 'Your profile needs changes. Please update your profile and resubmit.',
        }
        : { message: 'Logged in successfully' }),
    };
  }

  async socialSignupLogin(payload: CreateSocialLoginUserDTO) {
    console.log('[socialSignupLogin] payload:', {
      email: payload.email,
      socialId: payload.socialId,
      socialType: payload.socialType,
      role: payload.role,
    });

    let user = await this.userProvider.findOneBySocials(payload.socialId, payload.socialType);

    console.log('[socialSignupLogin] found by socialId:', user ? { id: user.id, email: user.email, role: user.role } : null);

    if (user) {
      if (String(user.role).toUpperCase() !== String(payload.role).toUpperCase()) {
        console.log('[socialSignupLogin] ROLE MISMATCH (social):', user.role, 'vs', payload.role);
        throw new BadRequestException(
          'You are not authorized to log in with this user role.',
        );
      }

      return this.socialGetUser(payload.fcmToken, user);
    }

    const existingUserByEmail = await this.userProvider.findOneByEmailOrUsername(payload.email);

    console.log('[socialSignupLogin] found by email:', existingUserByEmail ? { id: existingUserByEmail.id, email: existingUserByEmail.email, role: existingUserByEmail.role, socialType: existingUserByEmail.socialType } : null);

    if (existingUserByEmail) {
      if (String(existingUserByEmail.role).toUpperCase() !== String(payload.role).toUpperCase()) {
        console.log('[socialSignupLogin] ROLE MISMATCH (email):', existingUserByEmail.role, 'vs', payload.role);
        throw new BadRequestException(
          'You are not authorized to log in with this user role.',
        );
      }

      const method = existingUserByEmail.socialType
        ? this.formatSocialType(existingUserByEmail.socialType)
        : 'your email and password';

      throw new BadRequestException(
        `An account with this email already exists. Please log in using ${method}.`,
      );
    }

    if (!payload.role) {
      console.log('[socialSignupLogin] NO ROLE IN PAYLOAD — cannot create user');
      throw new BadRequestException('Role is required for social login.');
    }

    console.log('[socialSignupLogin] creating NEW user with role:', payload.role);

    const baseUsername = `${payload.firstName}${payload.lastName}`
      .toLowerCase()
      .replace(/\s+/g, '');
    payload.username = await this.generateUniqueUsername(baseUsername);

    if (payload.profileImg) {
      payload.profileImg = await this.mediaProvider.moveFile(
        FolderNames.PROFILE,
        payload.profileImg,
      );
    }

    user = await this.userProvider.createSocialUser({
      ...payload,
      status: UserStatus.ACTIVE,
    });

    return this.socialGetUser(payload.fcmToken, user);
  }

  private formatSocialType(type?: string | null): string {
    if (!type) return 'your email and password';
    const map: Record<string, string> = {
      GOOGLE: 'Google',
      APPLE: 'Apple',
      FACEBOOK: 'Facebook',
      LINKEDIN: 'LinkedIn',
    };
    return map[String(type).toUpperCase()] || type;
  }

  async sendSignupPhoneOtp(phone: string) {
    const otp = generateOtp(6);
    await this.otpPhoneRepository.createOtp(phone, otp, OTPType.VERIFICATION);
    await this.twilioService.sendSms(phone, `Your Seamfox verification code is ${otp}`);
    return { message: 'OTP sent to your phone' };
  }

  async verifyPhoneOtpAndSignup(payload: { phone: string; otp: string }) {
    const { phone, otp } = payload;

    const storedOtp = await this.otpPhoneRepository.findByPhoneAndCode(
      phone,
      Number(otp),
      OTPType.VERIFICATION,
    );
    if (!storedOtp) throw new NotFoundException('Invalid OTP. Please try again.');
    if (storedOtp.consumedAt)
      throw new BadRequestException('This OTP is already used. Please request a new one.');
    if (!storedOtp.createdAt)
      throw new BadRequestException('Invalid OTP record: missing timestamp.');

    const isExpired = new Date().getTime() - storedOtp.createdAt.getTime() > OTP_EXPIRE_IN_MS;
    if (isExpired) throw new BadRequestException('OTP expired. Please request a new one.');

    await this.otpPhoneRepository.markAsConsumed(storedOtp.id);
    return { message: 'Phone verified & account created successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userProvider.findOneByIdWithPassword(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.password) throw new BadRequestException('User password not found in database');

    const isMatch = await this.userProvider.isPasswordMatched(currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    if (currentPassword === newPassword)
      throw new BadRequestException('New password cannot be same as current password');

    const hashed = await this.userProvider.getHashedPassword(newPassword);
    await this.userProvider.updateUser(userId, { password: hashed } as any);

    const userWithProfile = await this.userProvider.findOneWithProfile(userId);
    const firstName =
      (userWithProfile as any)?.candidate?.firstName ||
      (userWithProfile as any)?.company?.name ||
      user.username ||
      'there';
    const dateTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Karachi',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    this.sendEmailSafe({
      to: user.email,
      subject: 'Your Seamfox password has been changed',
      html: getPasswordChangedTemplate({ firstName, dateTime }),
      text: getPasswordChangedText({ firstName, dateTime }),
    });

    return { message: 'Password changed successfully' };
  }

  async requestSupport(userId: string, message: string, subject?: string) {
    const user = await this.userProvider.findOneWithProfile(userId);
    if (!user) throw new NotFoundException('User not found');

    const senderName =
      user.company?.name ||
      (user.candidate ? `${user.candidate.firstName} ${user.candidate.lastName}` : null) ||
      user.username ||
      user.email;

    const emailSubject = subject || `Support Request from ${senderName}`;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>Support Request</title></head>
<body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <tr><td style="padding: 20px 24px; background-color: #022A45; color: #ffffff; font-size: 18px; font-weight: 600;">Support Request — Seamfox</td></tr>
    <tr>
      <td style="padding: 24px; color: #111827; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 12px;">Hi Support Team,</p>
        <p style="margin: 0 0 12px;"><strong>${senderName}</strong> (${user.email}) has submitted a support request:</p>
        <div style="background-color: #f3f4f6; border-left: 4px solid #022A45; padding: 12px 16px; border-radius: 4px; margin: 0 0 16px;">
          <p style="margin: 0; color: #374151;">${message}</p>
        </div>
        <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px;">Role: ${user.role} &nbsp;|&nbsp; User ID: ${userId}</p>
      </td>
    </tr>
  </table>
</body></html>`;

    const admins = (await this.userProvider['userRepository']?.findSuperAdmins?.()) ?? [];
    const adminEmails = admins.filter((a: any) => a.email).map((a: any) => a.email);
    const targets = ['support@seamfox.com', ...adminEmails];

    await Promise.all(
      targets.map((to: string) => this.emailService.send({ to, subject: emailSubject, html })),
    );
    return { message: 'Support request sent' };
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    let username = base;
    let counter = 0;
    while (await this.userProvider.findOneByEmailOrUsername(undefined, username)) {
      counter++;
      username = `${base}${counter}`;
    }
    return username;
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.userProvider.findOneByIdWithPassword(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.password && user.socialId && user.socialType) {
      throw new BadRequestException(
        `Your account uses ${user.socialType} login. Please verify with ${user.socialType} to delete.`,
      );
    }
    if (!user.password) {
      throw new BadRequestException('Password authentication is not set up for this account');
    }

    const isPasswordValid = await this.userProvider.isPasswordMatched(password, user.password);
    if (!isPasswordValid) throw new BadRequestException('Incorrect password. Please try again.');

    return this.performHardDelete(user);
  }

  async deleteAccountSocial(userId: string, providedSocialId: string, providedSocialType: string) {
    const user = await this.userProvider.findOneByIdWithPassword(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.socialId || !user.socialType) {
      throw new BadRequestException(
        'This account does not have social login configured. Please use password to delete.',
      );
    }
    if (user.socialId !== providedSocialId) {
      throw new BadRequestException(
        'Social verification failed. The account you authenticated with does not match.',
      );
    }
    if (user.socialType.toUpperCase() !== providedSocialType.toUpperCase()) {
      throw new BadRequestException(
        `This account is linked with ${user.socialType}, not ${providedSocialType}.`,
      );
    }

    return this.performHardDelete(user);
  }


  private async performHardDelete(user: User) {
    await this.assertDeletable(user);

    const userEmail = user.email;
    const userName = (user as any).firstName || user.username || 'User';

    this.sendEmailSafe({
      to: userEmail,
      subject: 'Your Seamfox account has been deleted',
      html: this.buildAccountDeletedEmailHTML({ userName }),
    });

    await this.userProvider.anonymizeAndArchiveUser(user.id, 'SELF');

    return {
      message:
        'Your account has been deleted. Your personal data has been removed and your activity has been anonymized.',
    };
  }

  private buildAccountDeletedEmailHTML(params: { userName: string }): string {
    const { userName } = params;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>

<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 12px;">
<tr>
<td align="center">

<table role="presentation" width="600" cellpadding="0" cellspacing="0"
style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(2,42,69,0.08);">


<tr>
<td style="background:#022A45;padding:24px;text-align:center;">

<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">
Sea<span style="color:#CD4E1A;">m</span>Fox
</h1>

<p style="margin:6px 0 0;color:#a8c0d0;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
Account Deleted
</p>

</td>
</tr>


<tr>
<td style="padding:32px 28px 16px;">

<p style="margin:0 0 14px;color:#022A45;font-size:18px;font-weight:700;">
Hi ${userName},
</p>


<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
Your Seamfox account has been permanently deleted. All your data has been removed from our systems.
</p>


<div style="background:#fff8f4;border-left:4px solid #CD4E1A;padding:16px 18px;border-radius:8px;margin:20px 0;">

<p style="margin:0;color:#1f2937;font-size:14px;line-height:1.6;">
Changed your mind? You can <strong>sign up again anytime</strong> with the same email. A fresh account will be created.
</p>

</div>


<p style="margin:24px 0 16px;color:#6b7280;font-size:13px;">
We're sorry to see you go. Thank you for being part of Seamfox.
</p>


<p style="margin:24px 0 0;color:#374151;font-size:15px;line-height:1.6;">
— The Seamfox Team
</p>


</td>
</tr>


<tr>
<td style="background:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e4e8ed;">

<p style="margin:0;color:#9ca3af;font-size:11px;">
© ${new Date().getFullYear()} Seamfox · Building careers in commodity trading
</p>

</td>
</tr>


</table>

</td>
</tr>
</table>

</body>
</html>`;
  }


  private async countCompanyJobs(userId: string): Promise<number> {
    return this.jobRepo
      .createQueryBuilder('job')
      .innerJoin('job.company', 'company')
      .where('company.userId = :userId', { userId })
      .getCount();
  }

  async getDeletionBlockers(userId: string) {
    const user = await this.userProvider.findOneByIdWithPassword(userId);
    if (!user) throw new NotFoundException('User not found');

    const blockers: { type: string; count: number; message: string }[] = [];

    if (user.role === UserRoles.COMPANY) {
      const jobCount = await this.countCompanyJobs(userId);

      if (jobCount > 0) {
        blockers.push({
          type: 'JOBS',
          count: jobCount,
          message: `You have ${jobCount} job${jobCount > 1 ? 's' : ''} posted. Please delete all your jobs before deleting your account.`,
        });
      }
    }

    const isSocial = !!user.socialId && !!user.socialType && !user.password;

    return {
      canDelete: blockers.length === 0,
      blockers,
      isSocial,
      socialType: isSocial ? user.socialType : null,
    };
  }

  private async assertDeletable(user: User) {
    if (user.role !== UserRoles.COMPANY) return;

    const jobCount = await this.countCompanyJobs(user.id);

    if (jobCount > 0) {
      throw new BadRequestException(
        `You cannot delete your account while you have ${jobCount} job${jobCount > 1 ? 's' : ''} posted. Please delete all your jobs first, then try again.`,
      );
    }
  }



}

