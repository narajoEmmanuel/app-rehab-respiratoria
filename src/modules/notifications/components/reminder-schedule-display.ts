/**
 * Purpose: Display helpers for today's reminder timeline.
 * Module: notifications
 */

import {
  isReminderTimePassed,
  parseTimeHHmm,
} from '@/src/modules/notifications/notification-settings.types';

export function findNextReminderTime(
  times: readonly string[],
  reference = new Date(),
): string | null {
  return times.find((time) => !isReminderTimePassed(time, reference)) ?? null;
}

export function formatMinutesUntilReminder(
  targetHHmm: string,
  reference = new Date(),
): string {
  const { hour, minute } = parseTimeHHmm(targetHHmm);
  const targetMinutes = hour * 60 + minute;
  const nowMinutes = reference.getHours() * 60 + reference.getMinutes();
  const diff = targetMinutes - nowMinutes;

  if (diff <= 0) return 'Pronto';
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours > 0 && minutes > 0) return `Falta ${hours} h ${minutes} min`;
  if (hours > 0) return `Falta ${hours} h`;
  return `Falta ${minutes} min`;
}

export type ReminderTimelineSlotState = 'passed' | 'next' | 'upcoming';

export function getReminderTimelineSlotState(
  time: string,
  nextTime: string | null,
  reference = new Date(),
): ReminderTimelineSlotState {
  if (nextTime === time) return 'next';
  if (isReminderTimePassed(time, reference)) return 'passed';
  return 'upcoming';
}

export function countPassedReminders(
  times: readonly string[],
  reference = new Date(),
): number {
  return times.filter((time) => isReminderTimePassed(time, reference)).length;
}

export function areAllRemindersCompletedToday(
  times: readonly string[],
  reference = new Date(),
): boolean {
  return times.length > 0 && findNextReminderTime(times, reference) == null;
}

export function formatTodayProgressSummary(completed: number, total: number): string {
  if (total <= 0) return '';
  return `${completed} de ${total} avisos completados`;
}
