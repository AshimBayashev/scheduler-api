import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class RoutinesQueryDto {
  @IsOptional()
  @IsUUID()
  forUserId?: string;

  @IsOptional()
  @IsIn(['family'])
  scope?: 'family';
}
