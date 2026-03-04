# Looks IQ | AI Facial Analysis

AI-powered facial analysis app built with React, Vite, and Google Gemini. Capture front and side selfies to get AI-generated aesthetic ratings and recommendations.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure API key**  
   Create a `.env.local` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Run locally**
   ```bash
   npm run dev
   ```

## Mobile (Capacitor)

This app is configured for iOS and Android via Capacitor.

### Build & Sync

```bash
npm run build
npm run cap:sync
```

### Run on device/simulator

- **iOS**: `npm run cap:ios` (requires Xcode)
- **Android**: `npm run cap:android` (requires Android Studio)

### Development workflow

1. Make changes to the web app
2. `npm run build`
3. `npm run cap:sync`
4. Open the native project in Xcode/Android Studio or run `npm run cap:ios` / `npm run cap:android`

## Tech Stack

- React 19
- Vite
- TypeScript
- Google Gemini AI
- Tailwind CSS (CDN)
- Capacitor (iOS & Android)
