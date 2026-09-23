import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UnAuthorizedHandler } from '../helpers/responseHandlers';
import { UserStatus } from '../enums/user.enum';

@Injectable()
export class isApprovedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    UnAuthorizedHandler({
      condition: !user || user.status !== UserStatus.ACTIVE,
      message: 'You are not active, Please create a report to admin',
    });
    return true;
  }
}
