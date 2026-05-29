import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from '../notifications/telegram.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class FamilyTelegramNotifier {
  private readonly logger = new Logger(FamilyTelegramNotifier.name);

  constructor(
    private readonly telegram: TelegramService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async notifyInvitation(
    inviteeUserId: string,
    inviterName: string | null,
    familyName: string,
  ) {
    const who = inviterName?.trim() || 'Кто-то';
    await this.sendToUser(
      inviteeUserId,
      `${who} приглашает вас в семью «${familyName}».\n\n${this.familyActionHint()}`,
    );
  }

  async notifyInvitationAccepted(
    inviterUserId: string,
    inviteeName: string | null,
    familyName: string,
  ) {
    const who = inviteeName?.trim() || 'Участник';
    await this.sendToUser(
      inviterUserId,
      `${who} принял(а) приглашение в «${familyName}».`,
    );
  }

  async notifyInvitationDeclined(
    inviterUserId: string,
    inviteeName: string | null,
    familyName: string,
  ) {
    const who = inviteeName?.trim() || 'Пользователь';
    await this.sendToUser(
      inviterUserId,
      `${who} отклонил(а) приглашение в «${familyName}».`,
    );
  }

  async notifyRemovedFromFamily(
    userId: string,
    familyName: string,
    leftVoluntarily: boolean,
  ) {
    const text = leftVoluntarily
      ? `Вы вышли из семьи «${familyName}».`
      : `Вас удалили из семьи «${familyName}».`;
    await this.sendToUser(userId, text);
  }

  async notifyMemberJoined(
    memberUserIds: string[],
    newMemberName: string | null,
    familyName: string,
    excludeUserId?: string,
  ) {
    const who = newMemberName?.trim() || 'Новый участник';
    const text = `${who} теперь в семье «${familyName}».`;
    for (const userId of memberUserIds) {
      if (userId === excludeUserId) continue;
      await this.sendToUser(userId, text);
    }
  }

  private familyActionHint(): string {
    const baseUrl = this.config.get<string>('APP_PUBLIC_URL')?.trim();
    if (baseUrl) {
      return `Примите или отклоните в приложении:\n${baseUrl.replace(/\/$/, '')}/profile#profile-family`;
    }
    return 'Примите или отклоните в приложении: Настройки → Семья (или плашка на главной).';
  }

  private async sendToUser(userId: string, text: string) {
    if (!this.telegram.isEnabled()) return;

    const user = await this.usersService.findById(userId);
    const chatId = user?.telegramChatId;
    if (!chatId) return;

    const sent = await this.telegram.sendMessage(chatId, text);
    if (!sent) {
      this.logger.warn(`Family TG notify failed for user ${userId}`);
    }
  }
}
