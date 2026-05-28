import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    text?: string;
  };
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private token: string | null = null;
  private botUsername: string | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.token = this.readToken();
    if (!this.token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN not set — Telegram reminders disabled',
      );
      return;
    }

    try {
      await this.apiCall('deleteWebhook', {});
      const me = await this.apiCall<{ username: string }>('getMe');
      this.botUsername = me.username;
      this.logger.log(`Telegram bot ready: @${me.username}`);
    } catch (err) {
      this.logger.error(`Telegram bot init failed: ${String(err)}`);
      this.token = null;
    }
  }

  isEnabled(): boolean {
    return !!this.token;
  }

  private readToken(): string | null {
    const raw =
      this.config.get<string>('TELEGRAM_BOT_TOKEN') ??
      process.env.TELEGRAM_BOT_TOKEN ??
      '';
    const trimmed = raw.trim().replace(/^["']|["']$/g, '');
    return trimmed || null;
  }

  getBotUsername(): string | null {
    return (
      this.botUsername ??
      this.config.get<string>('TELEGRAM_BOT_USERNAME') ??
      null
    );
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.token) return false;
    try {
      await this.apiCall('sendMessage', {
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      });
      return true;
    } catch (err) {
      this.logger.warn(`Telegram send failed for ${chatId}: ${String(err)}`);
      return false;
    }
  }

  async getUpdates(offset: number): Promise<TelegramUpdate[]> {
    return this.apiCall<TelegramUpdate[]>('getUpdates', {
      offset,
      timeout: 30,
      allowed_updates: ['message'],
    }, 35_000);
  }

  private async apiCall<T>(
    method: string,
    body?: Record<string, unknown>,
    timeoutMs = 10_000,
  ): Promise<T> {
    if (!this.token) throw new Error('Telegram not configured');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.token}/${method}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        },
      );

      const data = (await res.json()) as {
        ok: boolean;
        result?: T;
        description?: string;
      };

      if (!data.ok) {
        throw new Error(data.description ?? 'Telegram API error');
      }

      return data.result as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

export type { TelegramUpdate };
