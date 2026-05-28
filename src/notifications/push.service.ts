import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { PushSubscription } from './push-subscription.entity';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject =
      this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:admin@zalupa0613.kz';

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'VAPID keys not set — push notifications disabled. Generate with: npx web-push generate-vapid-keys',
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.enabled = true;
  }

  getPublicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? null;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async send(
    subscription: PushSubscription,
    payload: { title: string; body: string; url: string },
  ): Promise<'sent' | 'gone'> {
    if (!this.enabled) return 'sent';

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload),
      );
      return 'sent';
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) return 'gone';
      this.logger.warn(
        `Push failed for ${subscription.endpoint}: ${String(err)}`,
      );
      throw err;
    }
  }
}
