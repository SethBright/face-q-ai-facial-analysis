/**
 * User's preferred gender for personalization (e.g. landing hero image).
 * Male/female only; stored locally.
 */

export type GenderPreference = 'male' | 'female';

const STORAGE_KEY = 'faceq_gender';

export function getGender(): GenderPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'male';
    const v = raw as string;
    if (v === 'female') return 'female';
  } catch {
    // ignore
  }
  return 'male';
}

export function setGender(value: GenderPreference): void {
  localStorage.setItem(STORAGE_KEY, value);
}
