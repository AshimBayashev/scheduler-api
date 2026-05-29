import { IsDateString, IsOptional } from 'class-validator';

export class EventsRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/** Max calendar fetch window (matches UI month/week views). */
export const MAX_EVENTS_RANGE_DAYS = 366;
