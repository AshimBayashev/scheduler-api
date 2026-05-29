import { IsEmail, MaxLength } from 'class-validator';

export class InviteFamilyMemberDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}
