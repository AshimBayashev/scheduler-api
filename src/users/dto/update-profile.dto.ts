import { IsEmail, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  avatarUrl?: string | null;
}
