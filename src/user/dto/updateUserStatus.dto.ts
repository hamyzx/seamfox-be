import { IsIn, IsNotEmpty } from 'class-validator';
import { UserStatus } from '../../lib/enums/user.enum';

export class UpdateUserStatusDto {
  @IsNotEmpty()
  @IsIn([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.REJECT])
  status: UserStatus.ACTIVE | UserStatus.INACTIVE | UserStatus.REJECT;
}
