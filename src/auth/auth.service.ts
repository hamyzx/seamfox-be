import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { IAccessToken } from '../lib/interfaces/index.interface';
import { JwtService } from '@nestjs/jwt';
import { OTP_EXPIRE_IN_MS } from '../lib/constants/otp';
import { UserRoles, UserStatus } from '../lib/enums/user.enum';
import { User } from '../user/entities/user.entity';
import { CompanyStatus } from '../lib/enums/company.enum';
import { CandidateStatus } from '../lib/enums/candidate.enum';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  generateOTP(): string {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
  }

  generateToken(payload: IAccessToken): Promise<string> {
    const accesstoken = this.jwtService.signAsync(payload);
    return accesstoken;
  }

  checkIfOTPExpired(createdAt: Date): boolean {
    const now = new Date();
    const isExpired = now.getTime() - createdAt.getTime() > OTP_EXPIRE_IN_MS;
    return isExpired;
  }

  isInactive(status: UserStatus): boolean {
    return status === UserStatus.INACTIVE;
  }

  isNotVerified(status: UserStatus): boolean {
    return status === UserStatus.NOT_VERIFIED;
  }

  isRejected(status: UserStatus): boolean {
    return status === UserStatus.REJECT;
  }

  isBanned(status: UserStatus): boolean {
    return status === UserStatus.BAN;
  }

  handleBannedUserCase() {
    throw new ForbiddenException(
      'Your account has been suspended. Please contact support for assistance.',
    );
  }

  handleDeletedUserCase(deletedUser: User) {
    const isDeletedByAdmin = deletedUser.deletedBy?.role === UserRoles.SUPER_ADMIN;

    const message = isDeletedByAdmin
      ? 'Your account was deleted by an administrator. If this seems like a mistake, please contact support.'
      : 'This account was previously deleted. Please register again to continue.';

    throw new BadRequestException(message);
  }

  isCompanyInactive(status: CompanyStatus | CandidateStatus): boolean {
    return (
      status === CompanyStatus.PENDING ||
      status === CompanyStatus.REJECTED ||
      status === CompanyStatus.UNDER_REVIEW
    );
  }


  isCandidateBlocked(status: CandidateStatus): boolean {
    return (
      status === CandidateStatus.PENDING ||
      status === CandidateStatus.UNDER_REVIEW ||
      status === CandidateStatus.REJECTED
    );
  }

  generateResetToken(payload: {
    id: string;
    email: string;
    purpose: 'PASSWORD_RESET';
  }): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn: '15m' });
  }

  async verifyResetToken(
    token: string,
  ): Promise<{ id: string; email: string; purpose: string } | null> {
    try {
      const decoded = await this.jwtService.verifyAsync(token);
      return decoded as { id: string; email: string; purpose: string };
    } catch {
      return null;
    }
  }
}