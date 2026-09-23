import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserProvider } from '../../user/user.provider';
import { BadRequestHandler } from '../helpers/responseHandlers';
import { UserStatus } from '../enums/user.enum';

// 🔥 Special error codes — frontend interceptor detects these to trigger auto-logout
export const AUTH_ERROR_CODES = {
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_TOKEN: 'INVALID_TOKEN',
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private userProvider: UserProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    BadRequestHandler({ condition: !authHeader, message: 'Invalid token' });
    const token = authHeader!.split(' ')[1];

    BadRequestHandler({ condition: !token, message: 'Invalid token' });

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      Logger.error(error, '===err');
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_TOKEN);
    }

    // 🔥 Fetch live user state from DB to validate ban / deletion
    // (Token can be stale — admin may have banned the user after token was issued)
    const user = await this.userProvider.findOne(payload.id);

    if (!user) {
      throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
    }

    // 🔥 Block soft-deleted users
    if ((user as any).deletedAt) {
      throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_DELETED);
    }

    // 🔥 Block banned users — invalidates session immediately when admin bans
    if (user.status === UserStatus.BAN) {
      throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BANNED);
    }

    // 🔥 Block inactive users
    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
    }

    request.user = payload!;
    return true;
  }
}