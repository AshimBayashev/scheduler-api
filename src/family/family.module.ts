import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { FamilyInvitation } from './family-invitation.entity';
import { FamilyMember } from './family-member.entity';
import { FamilyController } from './family.controller';
import { Family } from './family.entity';
import { FamilyService } from './family.service';
import { FamilyTelegramNotifier } from './family-telegram.notifier';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Family,
      FamilyMember,
      FamilyInvitation,
      User,
    ]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [FamilyController],
  providers: [FamilyService, FamilyTelegramNotifier],
  exports: [FamilyService],
})
export class FamilyModule {}
