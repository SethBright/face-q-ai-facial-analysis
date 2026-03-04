/**
 * Clears all app-local data (scans, usage, streak, coach usage, task completions, gender).
 * Used for "Delete my account" — no server account; this resets the app to a fresh state.
 */

const KEYS_TO_REMOVE = [
  'faceq_scans',
  'faceq_usage',
  'faceq_streak_dates',
  'faceq_coach_usage',
  'faceq_coach_chat',
  'faceq_daily_routine',
  'faceq_task_completions',
  'faceq_gender',
  'faceq_onboarding_done',
];

export function clearAllAppData(): void {
  KEYS_TO_REMOVE.forEach((key) => localStorage.removeItem(key));
}
