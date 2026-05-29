import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class EventsRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  forUserId?: string;

  @IsOptional()
  @IsIn(['family'])
  scope?: 'family';
}

/** Max calendar fetch window (matches UI month/week views). */
export const MAX_EVENTS_RANGE_DAYS = 366;
