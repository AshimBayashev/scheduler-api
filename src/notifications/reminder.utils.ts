import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { getISODay } from 'date-fns';
import { DEFAULT_REMINDER_MINUTES } from '../common/reminder-options';
import { EventEntity } from '../events/event.entity';
import { Routine } from '../routines/routine.entity';

export interface ReminderCandidate {
  userId: string;
  sourceType: 'event' | 'routine';
  sourceId: string;
  fireAt: Date;
  title: string;
  body: string;
  url: string;
}

function truncateMinute(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

export function getEventReminderCandidate(
  event: EventEntity,
  windowStart: Date,
  windowEnd: Date,
): ReminderCandidate | null {
  const minutes = event.reminderMinutesBefore;
  if (minutes === null || minutes === undefined) return null;

  const anchor = event.allDay
    ? truncateMinute(event.start)
    : truncateMinute(event.start);
  const fireAt = new Date(anchor.getTime() - minutes * 60_000);
  if (fireAt < windowStart || fireAt >= windowEnd) return null;

  const when =
    minutes === 0
      ? 'Сейчас'
      : minutes === 60
        ? 'Через час'
        : `Через ${minutes} мин`;

  return {
    userId: event.userId,
    sourceType: 'event',
    sourceId: event.id,
    fireAt,
    title: when,
    body: event.title,
    url: '/calendar',
  };
}

export function getRoutineReminderCandidates(
  routine: Routine,
  timezone: string,
  windowStart: Date,
  windowEnd: Date,
): ReminderCandidate[] {
  const minutes = routine.reminderMinutesBefore;
  if (minutes === null || minutes === undefined || !routine.active) return [];

  const dateStr = formatInTimeZone(windowStart, timezone, 'yyyy-MM-dd');
  const startUtc = fromZonedTime(
    `${dateStr}T${routine.startTime}:00`,
    timezone,
  );
  const isoDay = getISODay(toZonedTime(windowStart, timezone));
  if (!routine.daysOfWeek.includes(isoDay)) return [];
  const fireAt = new Date(
    truncateMinute(startUtc).getTime() - minutes * 60_000,
  );

  if (fireAt < windowStart || fireAt >= windowEnd) return [];

  const when =
    minutes === 0
      ? 'Сейчас'
      : minutes === 60
        ? 'Через час'
        : `Через ${minutes} мин`;

  return [
    {
      userId: routine.userId,
      sourceType: 'routine',
      sourceId: routine.id,
      fireAt,
      title: when,
      body: `${routine.title} (рутина)`,
      url: '/calendar',
    },
  ];
}

export { DEFAULT_REMINDER_MINUTES };
