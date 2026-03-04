# Google Play – pre-launch checklist

Use this before submitting Looks IQ to the Google Play Store.

---

## 1. Google Play Console setup

- [ ] **Create a developer account** at [play.google.com/console](https://play.google.com/console). One-time registration fee (e.g. $25).
- [ ] **Create the app** in Play Console: New app → name “Looks IQ” (or your app name).
- [ ] **App details**:
  - **Package name**: `com.faceq.app` (must match `applicationId` in `android/app/build.gradle`).
  - **Category**: e.g. Health & Fitness or Lifestyle.
  - **Content rating**: Complete the questionnaire (IARC / store rating).
  - **Target audience**: Age groups; face/photo analysis may affect this.
  - **News app / COVID**: Answer as required (usually No).

---

## 2. Build a release AAB (Android App Bundle)

- [ ] **Sync and build** from project root:
  ```bash
  npm run build
  npx cap sync android
  cd android && ./gradlew bundleRelease
  ```
- [ ] **Output**: `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] **Signing**: First time you need a **upload key** (Play App Signing can manage the store key).
  - Create a keystore and sign the AAB, or use Play App Signing and upload the first AAB; Play will prompt you to create/register a key.
  - Document keystore path, alias, and passwords securely; you need them for all future updates.

---

## 3. Store listing (Play Console)

- [ ] **Short description** (max 80 chars).
- [ ] **Full description** (max 4000 chars).
- [ ] **Graphics**:
  - App icon: 512×512 PNG.
  - Feature graphic: 1024×500.
  - Screenshots: at least 2 (phone); 7” and 10” if you support tablets.
- [ ] **Privacy Policy URL**: Same as iOS, e.g.  
  `https://deep-prune-f6d.notion.site/Privacy-Policy-311918592e9780a2b7c2f987da9671bc`
- [ ] **Contact**: Email (and optionally website) for support.

---

## 4. Legal & in-app links (match iOS)

- [ ] **Privacy Policy** and **Terms of Use** URLs set in Play Console and working in the app (Settings, Paywall).
- [ ] **Contact support** in app opens your support page.

---

## 5. In-app purchases (RevenueCat + Play)

- [ ] **Google Play Console** → Your app → **Monetize** → **Subscriptions**:
  - Create a **subscription product** (e.g. weekly $3.99, product ID e.g. `looksiq_pro_weekly`).
  - Activate the product.
- [ ] **RevenueCat** ([app.revenuecat.com](https://app.revenuecat.com)):
  - Add **Android app** with package name `com.faceq.app`.
  - Link the same entitlement (e.g. “Looks IQ Pro”) and create an offering with the **Google Play** subscription product.
  - Copy the **Android app-specific API key** (starts with `goog_`).
- [ ] **Environment**: In `.env`, set `VITE_REVENUECAT_API_KEY_ANDROID=goog_...`. Do not commit the key; use `.env.example` to document.
- [ ] **Testing**: Use a **license tester** in Play Console, or a test track with a test account; no real charge.

---

## 6. Permissions & policies

- [ ] **AndroidManifest**: Ensure only needed permissions (camera, etc.); Play may reject if you request more than you use.
- [ ] **Data safety**: In Play Console, fill out “Data safety” (what you collect, whether it’s shared, etc.). Align with your Privacy Policy.
- [ ] **Ads**: If you add ads later, declare in store listing and Data safety.

---

## 7. Release

- [ ] **Internal testing** (optional): Upload AAB to Internal testing, install and verify.
- [ ] **Closed / Open testing** (optional): Add testers and do a staged rollout if you want.
- [ ] **Production**: Create a release → Upload the signed AAB → Add release notes → Review and roll out.

---

## 8. After first upload

- [ ] **Version codes**: For each new release, bump `versionCode` in `android/app/build.gradle` (and `versionName` if you want, e.g. 1.1).
- [ ] Rebuild: `npm run build && npx cap sync android`, then `./gradlew bundleRelease` and upload the new AAB.

---

## Quick command reference

```bash
# Build web and sync to Android
npm run build && npx cap sync android

# Build release AAB (from project root)
cd android && ./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```
