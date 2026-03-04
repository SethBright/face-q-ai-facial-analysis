/**
 * RevenueCat in-app purchases service.
 * Configure in RevenueCat dashboard: create an entitlement (e.g. "pro") and attach your App Store / Play subscription product.
 * Set VITE_REVENUECAT_API_KEY_IOS and VITE_REVENUECAT_API_KEY_ANDROID in .env (use App-specific keys from Project Settings > API keys).
 */

import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

const ENTITLEMENT_ID = 'Looks IQ Pro';

function getApiKey(): string | null {
  if (Capacitor.getPlatform() === 'ios') {
    return import.meta.env.VITE_REVENUECAT_API_KEY_IOS ?? null;
  }
  if (Capacitor.getPlatform() === 'android') {
    return import.meta.env.VITE_REVENUECAT_API_KEY_ANDROID ?? null;
  }
  return null;
}

let configured = false;

export async function configurePurchases(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('RevenueCat: No API key set. Set VITE_REVENUECAT_API_KEY_IOS / VITE_REVENUECAT_API_KEY_ANDROID in .env');
    return;
  }
  if (configured) return;
  try {
    await Purchases.setLogLevel({ level: 4 }); // DEBUG for development
    await Purchases.configure({
      apiKey,
      appUserID: null,
    });
    configured = true;
  } catch (e) {
    console.error('RevenueCat configure failed', e);
  }
}

export async function isPro(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const ent = (customerInfo as { entitlements?: { active?: Record<string, { isActive?: boolean }> } }).entitlements?.active;
    return Boolean(ent?.[ENTITLEMENT_ID]?.isActive);
  } catch {
    return false;
  }
}

export async function purchasePro(): Promise<{ success: boolean; error?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Purchases are only available in the app.' };
  }
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current?.availablePackages?.length) {
      return { success: false, error: 'No subscription option available.' };
    }
    // Prefer weekly, then monthly, then first package
    const pkg =
      current.weekly ??
      current.monthly ??
      current.annual ??
      current.availablePackages[0];
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    const info = (result as { customerInfo?: { entitlements?: { active?: Record<string, unknown> } } }).customerInfo;
    const hasPro = info?.entitlements?.active?.[ENTITLEMENT_ID];
    return { success: Boolean(hasPro) };
  } catch (e: unknown) {
    const err = e as { message?: string; code?: number };
    if (err?.code === 2) {
      return { success: false, error: 'Purchase was cancelled.' };
    }
    return {
      success: false,
      error: err?.message ?? 'Purchase failed. Please try again.',
    };
  }
}

export async function restorePurchases(): Promise<{ success: boolean; isPro: boolean; error?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, isPro: false, error: 'Restore is only available in the app.' };
  }
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const ent = (customerInfo as { entitlements?: { active?: Record<string, { isActive?: boolean }> } }).entitlements?.active;
    const pro = Boolean(ent?.[ENTITLEMENT_ID]?.isActive);
    return { success: true, isPro: pro };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return {
      success: false,
      isPro: false,
      error: err?.message ?? 'Restore failed. Please try again.',
    };
  }
}
