/**
 * Tracks whether the user has completed the initial onboarding (Choose gender).
 * When false, show onboarding; when true, show main app.
 * Cleared on "Delete my account" so user sees onboarding again.
 */

const STORAGE_KEY = 'faceq_onboarding_done';

export function getOnboardingDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingDone(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // ignore
  }
}
