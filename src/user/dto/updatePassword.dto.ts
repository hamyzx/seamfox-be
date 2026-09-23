import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { passwordRegex } from '../../lib/regex';

export class UpdatePasswordDTO {
  @IsNotEmpty()
  @IsString()
  // @MinLength(8)
  // @Matches(passwordRegex, {
  //   message:
  //     'Old password must contain an uppercase letter, lowercase letter, a number, and a special character',
  // })
  oldPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(passwordRegex, {
    message:
      'New password must contain an uppercase letter, lowercase letter, a number, and a special character',
  })
  newPassword: string;
}
