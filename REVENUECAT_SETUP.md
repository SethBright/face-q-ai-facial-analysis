# RevenueCat IAP Setup

This app uses [RevenueCat](https://www.revenuecat.com/) for the **$3.99/week** Looks IQ Pro subscription. Subscribers get up to **50 scans per week** (resets each Monday); hitting the limit shows “Weekly limit reached” with no paywall. "Unlock now" on the paywall only completes after a successful purchase; then the app runs the analysis and shows your 1–100 scores.

## 1. RevenueCat dashboard

1. Sign up at [app.revenuecat.com](https://app.revenuecat.com/signup).
2. Create a **Project** and add your **iOS app** (bundle ID: `com.looksiq.ios`).
3. In **Project → API keys**, copy the **App-specific** keys:
   - **iOS** (starts with `appl_`)
   - **Android** (starts with `goog_`) if you add Android later.
4. Create an **Entitlement** (e.g. name: `pro`). This must match the ID used in code: `pro` (see `services/purchasesService.ts`).
5. Create an **Offering** (e.g. "Default") and add a **Package**:
   - Package type: **Weekly** (for $3.99/week).
   - Attach your App Store Connect **Subscription product ID** (e.g. `looksiq_pro_weekly`).

## 2. App Store Connect

1. In [App Store Connect](https://appstoreconnect.apple.com) → Your app → **Subscriptions**, create a **Subscription Group** and a **Subscription** (e.g. weekly, $3.99).
2. Note the **Product ID** (e.g. `looksiq_pro_weekly`).
3. In RevenueCat → **Products**, add this product and link it to your **pro** entitlement and the **Weekly** package.

## 3. Xcode

1. Open the iOS app in Xcode: `npx cap open ios`.
2. Select the **App** target → **Signing & Capabilities**.
3. Click **+ Capability** and add **In-App Purchase**.
4. Ensure **Swift Language Version** is 5.0+ (Build Settings → Swift Language Version).

## 4. Env vars

Copy `.env.example` to `.env.local` and set your keys:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- `VITE_REVENUECAT_API_KEY_IOS=appl_YourActualKey`
- Optionally `VITE_REVENUECAT_API_KEY_ANDROID=goog_...` for Android.

Rebuild the app so the env vars are picked up.

## 5. Testing

- Use **Sandbox** testers in App Store Connect to test purchases without real charges.
- RevenueCat also supports a **Test Store** (separate API key) for quick testing without App Store setup; see [RevenueCat Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox#testing-with-revenuecat-test-store).

## Flow in the app

1. User taps **Get Looks IQ Pro** on the results screen → paywall opens.
2. User taps **Unlock now** → RevenueCat shows the system purchase sheet.
3. On **success** → paywall closes, analysis runs, and the results screen shows the 1–100 scores.
4. **Restore Purchase** restores previous subscriptions and, if the user has **pro**, closes the paywall and runs analysis.
