import type { ScanRecord } from '../types';

const STORAGE_KEY = 'faceq_daily_routine';

export interface StoredRoutine {
  scanId: string;
  tasks: { emoji: string; label: string }[];
}

export function getStoredRoutine(scanId: string): { emoji: string; label: string }[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const { scanId: storedId, tasks } = parsed as StoredRoutine;
    if (storedId !== scanId || !Array.isArray(tasks)) return null;
    return tasks
      .filter(
        (t) =>
          t &&
          typeof t === 'object' &&
          typeof (t as { emoji?: unknown }).emoji === 'string' &&
          typeof (t as { label?: unknown }).label === 'string',
      )
      .slice(0, 4) as { emoji: string; label: string }[];
  } catch {
    return null;
  }
}

export function setStoredRoutine(scanId: string, tasks: { emoji: string; label: string }[]): void {
  try {
    const trimmed = tasks.slice(0, 4);
    const payload: StoredRoutine = { scanId, tasks: trimmed };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
}

