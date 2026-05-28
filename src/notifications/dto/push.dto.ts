import {
  IsInt,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { REMINDER_MINUTES_OPTIONS } from '../../common/reminder-options';

class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

class PushSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class SubscribePushDto {
  @ValidateNested()
  @Type(() => PushSubscriptionDto)
  subscription: PushSubscriptionDto;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UnsubscribePushDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;
}

export class ReminderMinutesDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @IsIn([...REMINDER_MINUTES_OPTIONS])
  reminderMinutesBefore?: number | null;
}
