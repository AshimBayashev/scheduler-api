import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { COLOR_PALETTE } from '../../common/color-palette';

export class CreateRoutineDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @IsOptional()
  @IsInt()
  @Min(5, { message: 'Длительность должна быть от 5 до 720 минут' })
  @Max(720, { message: 'Длительность должна быть от 5 до 720 минут' })
  durationMinutes?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek: number[];

  @IsOptional()
  @IsString()
  @IsIn([...COLOR_PALETTE])
  color?: string;
}
