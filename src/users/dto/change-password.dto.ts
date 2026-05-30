import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword, PASSWORD_MAX_LENGTH } from '../../common/password-policy';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @IsStrongPassword()
  newPassword: string;
}
