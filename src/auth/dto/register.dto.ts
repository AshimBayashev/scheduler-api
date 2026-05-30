import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword, PASSWORD_MAX_LENGTH } from '../../common/password-policy';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @IsStrongPassword()
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
