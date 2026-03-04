/**
 * Tracks weekly scan usage for Pro subscribers.
 * 50 scans/week cap to prevent abuse (e.g. bots); resets each Monday.
 */

const STORAGE_KEY = 'faceq_usage';
export const MAX_SCANS_PER_WEEK = 50;

interface UsageState {
  periodStart: string; // ISO date (Monday)
  count: number;
}

function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  return copy;
}

export function getCurrentPeriodStart(): string {
  const d = new Date();
  const monday = getMonday(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  return monday.toISOString().slice(0, 10);
}

function loadUsage(): UsageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { periodStart: getCurrentPeriodStart(), count: 0 };
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'periodStart' in parsed && 'count' in parsed) {
      return { periodStart: String(parsed.periodStart), count: Number(parsed.count) };
    }
  } catch {
    // ignore
  }
  return { periodStart: getCurrentPeriodStart(), count: 0 };
}

function saveUsage(state: UsageState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getUsage(): { count: number; periodStart: string; resetDate: string; isAtLimit: boolean } {
  const now = getCurrentPeriodStart();
  const stored = loadUsage();
  if (stored.periodStart !== now) {
    return {
      count: 0,
      periodStart: now,
      resetDate: getNextResetDate(),
      isAtLimit: false,
    };
  }
  return {
    count: stored.count,
    periodStart: stored.periodStart,
    resetDate: getNextResetDate(),
    isAtLimit: stored.count >= MAX_SCANS_PER_WEEK,
  };
}

export function getNextResetDate(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilNextMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysUntilNextMonday);
  return next.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function incrementUsage(): void {
  const now = getCurrentPeriodStart();
  const stored = loadUsage();
  if (stored.periodStart !== now) {
    saveUsage({ periodStart: now, count: 1 });
    return;
  }
  saveUsage({ periodStart: now, count: stored.count + 1 });
}

export function canUseScan(): boolean {
  const { count, periodStart } = loadUsage();
  const now = getCurrentPeriodStart();
  if (periodStart !== now) return true;
  return count < MAX_SCANS_PER_WEEK;
}
