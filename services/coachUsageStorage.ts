/**
 * Tracks weekly coach message usage for Pro subscribers.
 * 50 messages/week cap; resets each Monday (same as scans).
 */

import { getCurrentPeriodStart, getNextResetDate } from './usageStorage';

const STORAGE_KEY = 'faceq_coach_usage';
export const MAX_COACH_MESSAGES_PER_WEEK = 50;

interface CoachUsageState {
  periodStart: string;
  count: number;
}

function loadCoachUsage(): CoachUsageState {
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

function saveCoachUsage(state: CoachUsageState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getCoachUsage(): {
  count: number;
  periodStart: string;
  resetDate: string;
  isAtLimit: boolean;
} {
  const now = getCurrentPeriodStart();
  const stored = loadCoachUsage();
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
    isAtLimit: stored.count >= MAX_COACH_MESSAGES_PER_WEEK,
  };
}

export function incrementCoachUsage(): void {
  const now = getCurrentPeriodStart();
  const stored = loadCoachUsage();
  if (stored.periodStart !== now) {
    saveCoachUsage({ periodStart: now, count: 1 });
    return;
  }
  saveCoachUsage({ periodStart: now, count: stored.count + 1 });
}

export function canUseCoachMessage(): boolean {
  const stored = loadCoachUsage();
  const now = getCurrentPeriodStart();
  if (stored.periodStart !== now) return true;
  return stored.count < MAX_COACH_MESSAGES_PER_WEEK;
}
