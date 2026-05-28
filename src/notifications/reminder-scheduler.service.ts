import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
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

    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setSeconds(0, 0);
    const windowEnd = new Date(windowStart.getTime() + 60_000);

    const events = await this.eventsRepo.find({
      where: {
        start: Between(
          new Date(windowStart.getTime() - 86_400_000),
          new Date(windowEnd.getTime() + 86_400_000),
        ),
      },
    });

    const routines = await this.routinesRepo.find({ where: { active: true } });
    const users = await this.usersRepo.find();
    const tzByUser = new Map(
      users.map((u) => [u.id, u.timezone ?? 'Asia/Almaty']),
    );
    const telegramByUser = new Map(
      users.map((u) => [u.id, u.telegramChatId ?? null]),
    );

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
