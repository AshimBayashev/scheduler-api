import { EventEntity } from '../events/event.entity';
import { Routine } from '../routines/routine.entity';
import {
  getEventReminderCandidate,
  getRoutineReminderCandidates,
} from './reminder.utils';

describe('getEventReminderCandidate', () => {
  const baseEvent = {
    id: 'e1',
    userId: 'u1',
    title: 'Встреча',
    allDay: false,
    reminderMinutesBefore: 15,
    start: new Date('2026-05-28T10:00:00'),
  } as EventEntity;

  it('returns null when reminder is disabled', () => {
    const event = { ...baseEvent, reminderMinutesBefore: null };
    const windowStart = new Date('2026-05-28T09:44:00');
    const windowEnd = new Date('2026-05-28T09:45:00');
    expect(getEventReminderCandidate(event, windowStart, windowEnd)).toBeNull();
  });

  it('returns candidate when fire time is in window', () => {
    const windowStart = new Date('2026-05-28T09:45:00');
    const windowEnd = new Date('2026-05-28T09:46:00');
    const result = getEventReminderCandidate(baseEvent, windowStart, windowEnd);

    expect(result).toMatchObject({
      userId: 'u1',
      sourceType: 'event',
      sourceId: 'e1',
      title: 'Через 15 мин',
      body: 'Встреча',
    });
  });

  it('uses "Сейчас" for zero-minute reminder', () => {
    const event = { ...baseEvent, reminderMinutesBefore: 0 };
    const windowStart = new Date('2026-05-28T09:59:00');
    const windowEnd = new Date('2026-05-28T10:01:00');
    const result = getEventReminderCandidate(event, windowStart, windowEnd);
    expect(result?.title).toBe('Сейчас');
  });
});

describe('getRoutineReminderCandidates', () => {
  const routine = {
    id: 'r1',
    userId: 'u1',
    title: 'Зарядка',
    startTime: '08:00',
    daysOfWeek: [3],
    active: true,
    reminderMinutesBefore: 15,
  } as Routine;

  it('returns empty when routine inactive', () => {
    const inactive = { ...routine, active: false };
    const windowStart = new Date('2026-05-28T07:44:00Z');
    const windowEnd = new Date('2026-05-28T07:45:00Z');
    expect(
      getRoutineReminderCandidates(inactive, 'Asia/Almaty', windowStart, windowEnd),
    ).toEqual([]);
  });
});
