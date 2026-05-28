import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from '../events/event.entity';
import { Routine } from '../routines/routine.entity';
import { User } from '../users/user.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushSubscription, SentReminder } from './push-subscription.entity';
import { PushService } from './push.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramLinkToken } from './telegram-link.entity';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PushSubscription,
      SentReminder,
      TelegramLinkToken,
      EventEntity,
      Routine,
      User,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushService,
    TelegramService,
    TelegramBotService,
    ReminderSchedulerService,
  ],
})
export class NotificationsModule {}
