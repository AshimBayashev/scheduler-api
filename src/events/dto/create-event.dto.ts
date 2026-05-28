import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { COLOR_PALETTE } from '../../common/color-palette';
import { REMINDER_MINUTES_OPTIONS } from '../../common/reminder-options';

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  @IsIn([...COLOR_PALETTE])
  color?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @IsIn([...REMINDER_MINUTES_OPTIONS])
  reminderMinutesBefore?: number | null;
}
