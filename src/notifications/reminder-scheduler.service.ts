import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, Not, Repository } from 'typeorm';
import { EventEntity } from '../events/event.entity';
import { Routine } from '../routines/routine.entity';
import { User } from '../users/user.entity';
import { PushSubscription, SentReminder } from './push-subscription.entity';
import { PushService } from './push.service';
import {
  getEventReminderCandidate,
  getRoutineReminderCandidates,
} from './reminder.utils';
import { TelegramService } from './telegram.service';

const MS_PER_DAY = 86_400_000;

type RecipientUser = Pick<User, 'id' | 'timezone' | 'telegramChatId'>;

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly pushService: PushService,
    private readonly telegramService: TelegramService,
    @InjectRepository(EventEntity)
    private readonly eventsRepo: Repository<EventEntity>,
    @InjectRepository(Routine)
    private readonly routinesRepo: Repository<Routine>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(PushSubscription)
    private readonly subsRepo: Repository<PushSubscription>,
    @InjectRepository(SentReminder)
    private readonly sentRepo: Repository<SentReminder>,
  ) {}

  @Cron('0 * * * * *')
  async tick() {
    if (!this.pushService.isEnabled() && !this.telegramService.isEnabled()) {
      return;
    }

    const recipients = await this.getRecipientUsers();
    if (recipients.length === 0) {
      return;
    }

    const recipientIds = recipients.map((u) => u.id);
    const tzByUser = new Map(
      recipients.map((u) => [u.id, u.timezone ?? 'Asia/Almaty']),
    );
    const telegramByUser = new Map(
      recipients.map((u) => [u.id, u.telegramChatId ?? null]),
    );

    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setSeconds(0, 0);
    const windowEnd = new Date(windowStart.getTime() + 60_000);

    const [events, routines] = await Promise.all([
      this.eventsRepo.find({
        where: {
          userId: In(recipientIds),
          reminderMinutesBefore: Not(IsNull()),
          start: Between(
            new Date(windowStart.getTime() - MS_PER_DAY),
            new Date(windowEnd.getTime() + MS_PER_DAY),
          ),
        },
      }),
      this.routinesRepo.find({
        where: {
          userId: In(recipientIds),
          active: true,
          reminderMinutesBefore: Not(IsNull()),
        },
      }),
    ]);

    const candidates = [
      ...events
        .map((e) => getEventReminderCandidate(e, windowStart, windowEnd))
        .filter(Boolean),
      ...routines.flatMap((r) =>
        getRoutineReminderCandidates(
          r,
          tzByUser.get(r.userId) ?? 'Asia/Almaty',
          windowStart,
          windowEnd,
        ),
      ),
    ] as NonNullable<ReturnType<typeof getEventReminderCandidate>>[];

    for (const candidate of candidates) {
      await this.dispatch(candidate, telegramByUser.get(candidate.userId));
    }
  }

  /** Пользователи с push-подпиской или привязанным Telegram. */
  private async getRecipientUsers(): Promise<RecipientUser[]> {
    return this.usersRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.timezone', 'u.telegramChatId'])
      .leftJoin(PushSubscription, 'ps', 'ps.userId = u.id')
      .where('u.telegramChatId IS NOT NULL')
      .orWhere('ps.id IS NOT NULL')
      .distinct(true)
      .getMany();
  }

  private async dispatch(
    candidate: {
      userId: string;
      sourceType: 'event' | 'routine';
      sourceId: string;
      fireAt: Date;
      title: string;
      body: string;
      url: string;
    },
    telegramChatId: string | null | undefined,
  ) {
    const existing = await this.sentRepo.findOne({
      where: {
        userId: candidate.userId,
        sourceType: candidate.sourceType,
        sourceId: candidate.sourceId,
        fireAt: candidate.fireAt,
      },
    });
    if (existing) return;

    const subs = await this.subsRepo.find({
      where: { userId: candidate.userId },
    });

    let anySent = false;

    if (this.pushService.isEnabled() && subs.length > 0) {
      for (const sub of subs) {
        try {
          const result = await this.pushService.send(sub, {
            title: candidate.title,
            body: candidate.body,
            url: candidate.url,
          });
          if (result === 'gone') {
            await this.subsRepo.delete({ id: sub.id });
          } else {
            anySent = true;
          }
        } catch {
          /* logged in PushService */
        }
      }
    }

    if (this.telegramService.isEnabled() && telegramChatId) {
      const text = `⏰ ${candidate.title}\n${candidate.body}`;
      const sent = await this.telegramService.sendMessage(telegramChatId, text);
      if (sent) anySent = true;
    }

    if (!anySent) return;

    await this.sentRepo.save(
      this.sentRepo.create({
        userId: candidate.userId,
        sourceType: candidate.sourceType,
        sourceId: candidate.sourceId,
        fireAt: candidate.fireAt,
      }),
    );
  }
}
