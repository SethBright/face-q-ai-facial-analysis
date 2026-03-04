/**
 * Requests an in-app review so the user can rate the app in the App Store (iOS) or Play Store (Android).
 * On native, uses the system review dialog; on web, no-op (or open store URL if you set one).
 */

import { Capacitor } from '@capacitor/core';
import { InAppReview } from '@capacitor-community/in-app-review';

export async function requestAppReview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    // Optional: open your App Store / Play Store page in a new window when running in browser
    // const url = Capacitor.getPlatform() === 'ios'
    //   ? 'https://apps.apple.com/app/idYOUR_APP_ID?action=write-review'
    //   : 'https://play.google.com/store/apps/details?id=com.looksiq.ios';
    // window.open(url, '_blank');
    return;
  }
  try {
    await InAppReview.requestReview();
  } catch {
    // System may not show the dialog (e.g. rate limit); fail silently
  }
}
