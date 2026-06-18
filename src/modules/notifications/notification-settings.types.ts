/**

 * Purpose: Local notification settings model for therapy adherence reminders.

 * Module: notifications

 */



export type NotificationPermissionStatus = 'undetermined' | 'granted' | 'denied';



export type NotificationTone = 'suave' | 'motivador' | 'clinico';



export type ReminderScheduleMode = 'fixedTimes' | 'interval';



export type IntervalRecommendationStatus = 'recommended' | 'lessFrequent';



export type NotificationSettings = {

  enabled: boolean;

  permissionStatus: NotificationPermissionStatus;

  reminderTimes: string[];

  tone: NotificationTone;

  pauseUntil: string | null;

  scheduledNotificationIds: string[];

  lastScheduledAt: string | null;

  /** Stable key (`title\\0body`) of the last delivered/scheduled reminder copy — avoids consecutive duplicates. */
  lastReminderMessageKey: string | null;

  scheduleMode: ReminderScheduleMode;

  /** Hours between reminders (1–12). */

  intervalHours: number;

  activeWindowStart: string;

  activeWindowEnd: string;

};



export const DEFAULT_REMINDER_TIMES: readonly string[] = ['09:00', '14:00', '19:00'];



export const MIN_INTERVAL_HOURS = 1;

export const MAX_INTERVAL_HOURS = 12;

export const DEFAULT_INTERVAL_HOURS = 2;

export const RECOMMENDED_INTERVAL_MIN_HOURS = 1;

export const RECOMMENDED_INTERVAL_MAX_HOURS = 2;

export const MAX_DAILY_SCHEDULED_REMINDERS = 64;

export const PREVIEW_TIME_CHIP_LIMIT = 12;



export type ActiveWindowPreset = {

  label: string;

  start: string;

  end: string;

};



export const ACTIVE_WINDOW_PRESETS: readonly ActiveWindowPreset[] = [

  { label: '08:00 a 20:00', start: '08:00', end: '20:00' },

  { label: '08:00 a 22:00', start: '08:00', end: '22:00' },

  { label: '09:00 a 21:00', start: '09:00', end: '21:00' },

];



export const NOTIFICATION_TONE_OPTIONS: readonly NotificationTone[] = ['suave', 'motivador', 'clinico'];



export const SYSTEM_SCHEDULE_LIMIT_NOTICE =
  'Intervalo muy frecuente. El sistema del celular puede limitar la cantidad de avisos programados.';

export const ACTIVE_WINDOW_INVALID_MESSAGE =
  'El horario final debe ser posterior al horario inicial.';

const TIME_HH_MM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeHHmm(value: string): boolean {
  return TIME_HH_MM.test(value.trim());
}

export function normalizeTimeHHmm(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!isValidTimeHHmm(trimmed)) {
    return fallback;
  }
  const { hour, minute } = parseTimeHHmm(trimmed);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function isActiveWindowValid(start: string, end: string): boolean {
  if (!isValidTimeHHmm(start) || !isValidTimeHHmm(end)) {
    return false;
  }
  return timeToMinutes(end) > timeToMinutes(start);
}



export function createDefaultNotificationSettings(): NotificationSettings {

  return {

    enabled: false,

    permissionStatus: 'undetermined',

    reminderTimes: [...DEFAULT_REMINDER_TIMES],

    tone: 'motivador',

    pauseUntil: null,

    scheduledNotificationIds: [],

    lastScheduledAt: null,

    lastReminderMessageKey: null,

    scheduleMode: 'interval',

    intervalHours: DEFAULT_INTERVAL_HOURS,

    activeWindowStart: '08:00',

    activeWindowEnd: '22:00',

  };

}



export function clampIntervalHours(value: unknown): number {

  const numeric =

    typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : DEFAULT_INTERVAL_HOURS;

  return Math.min(MAX_INTERVAL_HOURS, Math.max(MIN_INTERVAL_HOURS, numeric));

}



export function getIntervalRecommendationStatus(

  intervalHours: number,

): IntervalRecommendationStatus {

  const hours = clampIntervalHours(intervalHours);

  if (hours > RECOMMENDED_INTERVAL_MAX_HOURS) return 'lessFrequent';

  return 'recommended';

}



export type IntervalRecommendationTheme = {

  label: string;

  notice: string;

  badgeBackground: string;

  badgeText: string;

  noticeText: string;

};



export function getIntervalRecommendationTheme(

  status: IntervalRecommendationStatus,

): IntervalRecommendationTheme {

  if (status === 'recommended') {

    return {

      label: 'Rango recomendado',

      notice: 'Dentro del rango recomendado',

      badgeBackground: 'rgba(52, 171, 165, 0.14)',

      badgeText: '#1F7E7A',

      noticeText: '#4F756F',

    };

  }

  return {

    label: 'Menos frecuente',

    notice:

      'Intervalo mayor al rango recomendado. Podrías recibir menos apoyo para mantener la constancia.',

    badgeBackground: 'rgba(230, 175, 90, 0.18)',

    badgeText: '#8A6530',

    noticeText: '#8A6530',

  };

}



export function formatIntervalLabel(intervalHours: number): string {

  const hours = clampIntervalHours(intervalHours);

  return hours === 1 ? '1 h' : `${hours} h`;

}



export function stepIntervalHours(currentHours: number, direction: -1 | 1): number {

  return clampIntervalHours(currentHours + direction);

}



export function parseTimeHHmm(timeHHmm: string): { hour: number; minute: number } {

  const match = TIME_HH_MM.exec(timeHHmm.trim());

  if (!match) {

    throw new Error(`Hora inválida: se esperaba HH:mm, recibido "${timeHHmm}".`);

  }

  return { hour: Number(match[1]), minute: Number(match[2]) };

}



function timeToMinutes(timeHHmm: string): number {

  const { hour, minute } = parseTimeHHmm(timeHHmm);

  return hour * 60 + minute;

}



function minutesToTimeHHmm(totalMinutes: number): string {

  const hour = Math.floor(totalMinutes / 60);

  const minute = totalMinutes % 60;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

}



/** Computes daily reminder times within an active window at a fixed interval in hours. */

export function computeIntervalReminderTimes(

  startHHmm: string,

  endHHmm: string,

  intervalHours: number,

): string[] {

  const stepMinutes = clampIntervalHours(intervalHours) * 60;

  const start = timeToMinutes(startHHmm);

  const end = timeToMinutes(endHHmm);



  if (end <= start || stepMinutes <= 0) {

    return [];

  }



  const times: string[] = [];

  for (let minute = start; minute <= end; minute += stepMinutes) {

    times.push(minutesToTimeHHmm(minute));

  }

  return times;

}



export function resolveEffectiveReminderTimes(settings: NotificationSettings): string[] {

  return computeIntervalReminderTimes(

    settings.activeWindowStart,

    settings.activeWindowEnd,

    settings.intervalHours,

  );

}



export function resolveSchedulableReminderTimes(settings: NotificationSettings): string[] {

  return resolveEffectiveReminderTimes(settings).slice(0, MAX_DAILY_SCHEDULED_REMINDERS);

}



export function exceedsDailyScheduleLimit(settings: NotificationSettings): boolean {

  return resolveEffectiveReminderTimes(settings).length > MAX_DAILY_SCHEDULED_REMINDERS;

}



export function buildPreviewDisplay(times: readonly string[]): {

  visibleTimes: string[];

  remainingCount: number;

  totalCount: number;

} {

  const totalCount = times.length;

  const visibleTimes = times.slice(0, PREVIEW_TIME_CHIP_LIMIT);

  return {

    visibleTimes,

    remainingCount: Math.max(0, totalCount - visibleTimes.length),

    totalCount,

  };

}



export function applyNotificationDefaults(settings: NotificationSettings): NotificationSettings {
  const defaults = createDefaultNotificationSettings();
  return {
    ...settings,
    tone: 'motivador',
    pauseUntil: null,
    scheduleMode: 'interval',
    intervalHours: DEFAULT_INTERVAL_HOURS,
    activeWindowStart: normalizeTimeHHmm(settings.activeWindowStart, defaults.activeWindowStart),
    activeWindowEnd: normalizeTimeHHmm(settings.activeWindowEnd, defaults.activeWindowEnd),
  };
}



export function notificationToneLabel(tone: NotificationTone): string {

  if (tone === 'suave') return 'Suave';

  if (tone === 'clinico') return 'Clínico';

  return 'Motivador';

}



export function formatProfileReminderSummary(settings: NotificationSettings): string {

  if (!settings.enabled) return 'Pausados';

  return `Cada ${formatIntervalLabel(settings.intervalHours)}, ${settings.activeWindowStart} a ${settings.activeWindowEnd}`;

}



export type ProfileReminderStatus =
  | 'active'
  | 'paused'
  | 'no_permission'
  | 'requires_review'
  | 'web_only'
  | 'app_disabled';



export function resolveProfileReminderStatus(
  settings: NotificationSettings | null,
  nativeSupported: boolean,
  notificationsGloballyEnabled = true,
): ProfileReminderStatus | null {
  if (settings == null) return null;
  if (!notificationsGloballyEnabled) return 'app_disabled';
  if (!nativeSupported) return 'web_only';
  if (settings.permissionStatus === 'denied') return 'no_permission';
  if (!settings.enabled) return 'paused';
  if (settings.permissionStatus === 'granted') return 'active';
  return 'requires_review';
}



export function profileReminderStatusLabel(status: ProfileReminderStatus | null): string {
  switch (status) {
    case 'active':
      return 'Activas';
    case 'paused':
      return 'Pausadas';
    case 'no_permission':
      return 'Sin permiso';
    case 'requires_review':
      return 'Requiere revisión';
    case 'web_only':
      return 'Solo en app';
    case 'app_disabled':
      return 'Desactivados';
    default:
      return '—';
  }
}



export function profileReminderStatusHint(
  status: ProfileReminderStatus | null,
  settings: NotificationSettings | null,
): string {
  if (status === 'active' && settings != null) {
    return formatProfileReminderSummary(settings);
  }
  if (status === 'no_permission') {
    return 'Revisa los permisos de notificaciones en la configuración de tu dispositivo.';
  }
  if (status === 'requires_review') {
    return 'Abre Recordatorios y confirma el permiso del sistema para activar los avisos.';
  }
  if (status === 'web_only') {
    return 'Los recordatorios locales están disponibles en la app para iPhone o Android.';
  }
  if (status === 'app_disabled') {
    return 'Recordatorios desactivados en esta versión de la app.';
  }
  return 'Configura horarios para mantener tu rutina.';
}



export function formatScheduleSummary(settings: NotificationSettings): string {

  return formatProfileReminderSummary(settings);

}



export function matchesActiveWindowPreset(

  settings: NotificationSettings,

  preset: ActiveWindowPreset,

): boolean {

  return settings.activeWindowStart === preset.start && settings.activeWindowEnd === preset.end;

}



export function isPausedForToday(pauseUntil: string | null | undefined): boolean {

  if (pauseUntil == null || pauseUntil === '') return false;

  const today = localDateIso(new Date());

  return pauseUntil.slice(0, 10) === today;

}



export function normalizePauseUntil(pauseUntil: string | null | undefined): string | null {

  if (pauseUntil == null || pauseUntil === '') return null;

  const pausedDay = pauseUntil.slice(0, 10);

  const today = localDateIso(new Date());

  if (pausedDay < today) return null;

  return pausedDay;

}



export function localDateIso(date: Date): string {

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, '0');

  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;

}



export function reminderCountLabel(count: number): string {
  if (count === 1) return '1 recordatorio';
  return `${count} recordatorios`;
}

export function isReminderTimePassed(timeHHmm: string, reference = new Date()): boolean {
  const { hour, minute } = parseTimeHHmm(timeHHmm);
  const reminderMinutes = hour * 60 + minute;
  const nowMinutes = reference.getHours() * 60 + reference.getMinutes();
  return reminderMinutes <= nowMinutes;
}



/** Migrates legacy intervalMinutes or intervalHours when loading raw storage. */

export function resolveIntervalHoursFromRaw(raw: Record<string, unknown>): number {

  if (typeof raw.intervalHours === 'number') {

    return clampIntervalHours(raw.intervalHours);

  }

  if (typeof raw.intervalMinutes === 'number') {

    return clampIntervalHours(Math.round(raw.intervalMinutes / 60));

  }

  return DEFAULT_INTERVAL_HOURS;

}


