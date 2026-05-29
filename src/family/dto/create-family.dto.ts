import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFamilyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;
}

export class UpdateFamilyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
