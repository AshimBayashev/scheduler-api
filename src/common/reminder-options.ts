/** null = напоминание выключено */
export const REMINDER_MINUTES_OPTIONS = [0, 5, 10, 15, 30, 60] as const;

export const DEFAULT_REMINDER_MINUTES = 15;

export type ReminderMinutes =
  | (typeof REMINDER_MINUTES_OPTIONS)[number]
  | null;

export function isValidReminderMinutes(
  value: unknown,
): value is ReminderMinutes {
  return (
    value === null ||
    REMINDER_MINUTES_OPTIONS.includes(value as (typeof REMINDER_MINUTES_OPTIONS)[number])
  );
}
