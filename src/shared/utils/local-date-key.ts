/**
 * Local calendar YYYY-MM-DD for device timezone (not UTC midnight via toISOString).
 */

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calendar day for a stored session timestamp (ISO) or legacy date-only string.
 * Never uses toISOString().slice(0, 10) (UTC) for bucketing.
 */
export function sessionRecordLocalDayKey(sessionDate: string | null | undefined): string | null {
  if (sessionDate == null) return null;
  const trimmed = String(sessionDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const ms = Date.parse(trimmed);
  if (!Number.isNaN(ms)) {
    return getLocalDateKey(new Date(ms));
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return null;
}

export function addDaysLocal(ymd: string, deltaDays: number): string {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return ymd;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const dt = new Date(y, m - 1, d + deltaDays);
  return getLocalDateKey(dt);
}
