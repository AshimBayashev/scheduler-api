import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { TelegramLinkToken } from './telegram-link.entity';
import { TelegramService } from './telegram.service';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private offset = 0;

  constructor(
    private readonly telegram: TelegramService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(TelegramLinkToken)
    private readonly tokensRepo: Repository<TelegramLinkToken>,
  ) {}

  onModuleInit() {
    if (!this.telegram.isEnabled()) return;
    void this.pollLoop();
  }

  private async pollLoop() {
    this.logger.log('Telegram long polling started');
    while (true) {
      try {
        const updates = await this.telegram.getUpdates(this.offset);
        for (const update of updates) {
          this.offset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      } catch (err) {
        this.logger.error(`Telegram poll error: ${String(err)}`);
        await sleep(5_000);
      }
    }
  }

  private async handleUpdate(update: {
    message?: { chat: { id: number }; text?: string };
  }) {
    const message = update.message;
    if (!message?.text) return;

    const chatId = String(message.chat.id);
    const text = message.text.trim();

    if (text === '/stop' || text.startsWith('/stop@')) {
      await this.unlinkChat(chatId);
      return;
    }

    const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+(\S+))?/);
    if (!startMatch) return;

    const token = startMatch[1];
    if (!token) {
      await this.telegram.sendMessage(
        chatId,
        'Привет! Чтобы получать напоминания из Scheduler, нажми «Подключить Telegram» в приложении и открой ссылку оттуда.',
      );
      return;
    }

    await this.linkWithToken(chatId, token);
  }

  private async linkWithToken(chatId: string, token: string) {
    const link = await this.tokensRepo.findOne({ where: { token } });
    if (!link || link.expiresAt < new Date()) {
      await this.telegram.sendMessage(
        chatId,
        'Код устарел или неверный. Сгенерируй новую ссылку в Scheduler.',
      );
      return;
    }

    await this.usersRepo.update(link.userId, { telegramChatId: chatId });
    await this.tokensRepo.delete({ userId: link.userId });

    await this.telegram.sendMessage(
      chatId,
      'Готово! Напоминания из Scheduler будут приходить сюда.\n\nОтключить: /stop',
    );
  }

  private async unlinkChat(chatId: string) {
    const user = await this.usersRepo.findOne({ where: { telegramChatId: chatId } });
    if (!user) {
      await this.telegram.sendMessage(chatId, 'Этот чат не был привязан.');
      return;
    }

    await this.usersRepo.update(user.id, { telegramChatId: null });
    await this.telegram.sendMessage(chatId, 'Напоминания отключены.');
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
