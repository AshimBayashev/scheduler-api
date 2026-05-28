import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { SubscribePushDto, UnsubscribePushDto } from './dto/push.dto';
import { PushSubscription } from './push-subscription.entity';
import { PushService } from './push.service';
import { TelegramLinkToken } from './telegram-link.entity';
import { TelegramService } from './telegram.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly pushService: PushService,
    private readonly telegramService: TelegramService,
    @InjectRepository(PushSubscription)
    private readonly subsRepo: Repository<PushSubscription>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(TelegramLinkToken)
    private readonly telegramTokensRepo: Repository<TelegramLinkToken>,
  ) {}

  getVapidPublicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  async subscribe(userId: string, dto: SubscribePushDto) {
    const { subscription, timezone } = dto;
    const existing = await this.subsRepo.findOne({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      existing.userId = userId;
      existing.p256dh = subscription.keys.p256dh;
      existing.auth = subscription.keys.auth;
      await this.subsRepo.save(existing);
    } else {
      await this.subsRepo.save(
        this.subsRepo.create({
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        }),
      );
    }

    if (timezone) {
      await this.usersRepo.update(userId, { timezone });
    }

    return { success: true };
  }

  async unsubscribe(userId: string, dto: UnsubscribePushDto) {
    await this.subsRepo.delete({ endpoint: dto.endpoint, userId });
    return { success: true };
  }

  async getTelegramStatus(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    const botUsername = this.telegramService.getBotUsername();
    return {
      enabled: this.telegramService.isEnabled(),
      linked: !!user?.telegramChatId,
      botUsername,
    };
  }

  async createTelegramLink(userId: string) {
    if (!this.telegramService.isEnabled()) {
      return { enabled: false, linked: false, botUsername: null };
    }

    const botUsername = this.telegramService.getBotUsername();
    if (!botUsername) {
      throw new Error('Telegram bot username unavailable');
    }

    await this.telegramTokensRepo.delete({ userId });

    const token = randomBytes(5).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60_000);

    await this.telegramTokensRepo.save(
      this.telegramTokensRepo.create({ userId, token, expiresAt }),
    );

    return {
      enabled: true,
      token,
      botUsername,
      botUrl: `https://t.me/${botUsername}?start=${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async unlinkTelegram(userId: string) {
    await this.usersRepo.update(userId, { telegramChatId: null });
    await this.telegramTokensRepo.delete({ userId });
    return { success: true };
  }
}
