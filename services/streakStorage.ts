/**
 * Tracks which calendar days the user had "activity":
 * - completed at least one scan, OR
 * - completed at least one routine task.
 * "Current streak" = number of consecutive days ending today (today, yesterday, ...).
 */

const STORAGE_KEY = 'faceq_streak_dates';
const MAX_DATES = 365; // keep last year of dates

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function previousDay(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function loadDates(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveDates(dates: string[]): void {
  const unique = [...new Set(dates)].sort().slice(-MAX_DATES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

function addTodayIfNeeded(): void {
  const today = todayISO();
  const dates = loadDates();
  if (dates.includes(today)) return;
  saveDates([...dates, today]);
}

/** Call when the user completes a scan. Idempotent per day. */
export function recordStreakActivity(): void {
  addTodayIfNeeded();
}

/** Call when the user completes at least one routine task. Idempotent per day. Counts toward streak. */
export function recordTaskCompletion(): void {
  addTodayIfNeeded();
}

/**
 * Current streak = consecutive days ending today (today, yesterday, ...).
 * A day counts if the user completed a scan OR at least one routine task that day.
 * Returns 0 if no activity today.
 */
export function getCurrentStreak(): number {
  const dates = loadDates();
  const set = new Set(dates);
  const today = todayISO();
  if (!set.has(today)) return 0;
  let count = 0;
  let d: string = today;
  while (set.has(d)) {
    count += 1;
    d = previousDay(d);
  }
  return count;
}
