# App Store review – pre-launch checklist

Use this before submitting Looks IQ for App Store review.

---

## 1. App Store Connect setup

- [ ] **Create the app** in [App Store Connect](https://appstoreconnect.apple.com) with bundle ID `com.looksiq.ios`.
- [ ] **Version**: 1.0 (matches your Xcode `MARKETING_VERSION`).
- [ ] **Build number**: 1 (or higher; must increase for each upload).
- [ ] **Category**: e.g. Health & Fitness or Lifestyle.
- [ ] **Age rating**: Complete the questionnaire (face/photo analysis may affect rating).
- [ ] **App Privacy**: Fill out the “App Privacy” section (see section 4 below).

---

## 2. Legal & required links

Apple expects working links for Privacy and Terms; reviewers may tap them.

- [ ] **Privacy Policy**: Add in App Store Connect → App Information → Privacy Policy URL:  
  `https://deep-prune-f6d.notion.site/Privacy-Policy-311918592e9780a2b7c2f987da9671bc`
- [ ] **Terms of Use / EULA**: Add in App Store Connect → App Information → Terms of Use (or EULA) URL if required:  
  `https://deep-prune-f6d.notion.site/Terms-of-Use-311918592e9780a0b365f0291fd14530`
- [ ] **In the app**:  
  - **Settings** → Privacy and Terms buttons: link to your Privacy Policy and Terms URLs (or open in-app browser).  
  - **Paywall** → “Terms of Use” and “Privacy Policy”: same URLs.  
- [ ] **Contact support**: Settings → “Contact support” opens your Notion page:  
  `https://deep-prune-f6d.notion.site/Contact-Support-311918592e9780d799b2dcbf1b637b67`

---

## 3. In-app purchase (RevenueCat)

- [ ] **App Store Connect** → Your app → **Subscriptions**:  
  - Create a **Subscription Group**.  
  - Create a **Subscription** (e.g. weekly $3.99, Product ID e.g. `looksiq_pro_weekly`).
- [ ] **RevenueCat** ([app.revenuecat.com](https://app.revenuecat.com)):  
  - Project → add iOS app (bundle ID `com.looksiq.ios`).  
  - Create entitlement `pro` (must match code).  
  - Create offering (e.g. “Default”) with a **Weekly** package linked to `looksiq_pro_weekly`.  
  - Copy **iOS app-specific API key** (starts with `appl_`).
- [ ] **Xcode**: App target → **Signing & Capabilities** → add **In-App Purchase**.
- [ ] **Environment**: In `.env` (or build env), set `VITE_REVENUECAT_API_KEY_IOS=appl_...`.  
  - Do **not** commit real keys; use `.env` in `.gitignore` and document in `.env.example`.
- [ ] **Testing**: Test with an App Store Connect **Sandbox** tester account (no real charge).
- [ ] **Production**: Consider reducing RevenueCat log level for release (e.g. in `purchasesService.ts`, use a lower `level` when not in development).

---

## 4. App Privacy (Apple’s “nutrition label”)

- [ ] In App Store Connect → Your app → **App Privacy**:  
  - Declare **data types** (e.g. if you send photos/face data to Google for analysis, that’s “User Content” and possibly “Identifiers” depending on implementation).  
  - For each type: say whether it’s used for analytics, app functionality, etc., and whether it’s linked to identity or used to track.  
- [ ] **User ID** (when Apple asks how user IDs are used): select **only**:
  - **Product Personalization** — e.g. customizing what the user sees (personalized grooming/skincare recommendations from face analysis).
  - **App Functionality** — e.g. subscription/entitlement handling (RevenueCat anonymous ID for restore purchases, fraud prevention, server uptime).
  - Do **not** select: Third-Party Advertising, Developer's Advertising or Marketing, Analytics (usage is local only), or Other.  
- [ ] **User ID — linked to identity?** Answer: **No**. Select “No, user IDs collected from this app are not linked to the user’s identity.” (RevenueCat uses an anonymous app user ID only; you have no account/login and don’t tie the ID to name, email, or other identifiers.)  
- [ ] **User ID — used for tracking?** Answer: **No**. Select “No, we do not use user IDs for tracking purposes.” (Tracking = cross-app/cross-site tracking for ads or data brokers; your ID is only for subscriptions/restore, not tracking.)  
- [ ] Your **Privacy Policy** must clearly describe:  
  - Face/photo analysis (e.g. sent to Google Gemini).  
  - What’s stored locally (scans, preferences).  
  - Subscription handling (RevenueCat / Apple).  
  - Who to contact (support).

---

## 5. API keys & build

- [ ] **Gemini (face analysis)**: Set `GEMINI_API_KEY` in `.env` (or CI/build env).  
  - Vite injects it via `vite.config.ts`; ensure the key is available when you run `npm run build` for release.  
  - Never commit real keys; keep `.env` in `.gitignore`.
- [ ] **Release build**: Run `npm run build` then `npx cap sync ios` and archive from Xcode so the submitted build includes the correct env.

---

## 6. Icons & assets

- [ ] **App icon**: Ensure `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` exists and is **1024×1024** (no transparency, no rounded corners; Apple applies the mask).
- [ ] **Screenshots**: Prepare required sizes (e.g. 6.5" and 5.5" iPhone) for the first submission.
- [ ] **Optional**: App Preview video, promotional text.

---

## 7. App review notes (optional but helpful)

- [ ] **Notes for reviewer**: In App Store Connect, you can add “Notes” for the review team.  
  - Briefly explain: “User takes selfies; we analyze with AI and show scores; optional weekly subscription for more scans.”  
  - If you use a demo account, provide it here (Looks IQ has no login, so may not be needed).
- [ ] **Rate / In-App Review**: You use “Rate us” with the in-app review API; avoid prompting immediately on first launch; your current use (from Settings) is reasonable.

---

## 8. Code tweaks before submit

- [ ] **Privacy / Terms / Contact**: Replace empty `onClick={() => {}}` with real URLs or `mailto:` (Settings and Paywall).
- [ ] **RevenueCat**: Consider lowering `setLogLevel` for production builds.
- [ ] **Double-check**: Delete account flow and onboarding both work after “Delete my account.”

---

## 9. Final steps

- [ ] Archive in Xcode (Product → Archive).
- [ ] Upload build to App Store Connect (Distribute App → App Store Connect).
- [ ] In App Store Connect, select the build for the version and submit for review.
- [ ] Fill in all required metadata (description, keywords, support URL, etc.).

---

## Quick reference

| Item              | Where / What |
|-------------------|--------------|
| Bundle ID         | `com.looksiq.ios` |
| SKU (App Store Connect) | `looksiq-ios` |
| RevenueCat entitlement | `pro` |
| Env vars (release) | `GEMINI_API_KEY`, `VITE_REVENUECAT_API_KEY_IOS` |
| Privacy / Terms   | Add URLs in App Store Connect and in-app (Settings + Paywall) |
| Contact support   | Settings opens Notion Contact Support page       |
