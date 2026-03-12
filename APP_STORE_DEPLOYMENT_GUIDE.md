# UniTracker — App Store & Google Play Deployment Guide

This guide walks you through publishing UniTracker to both the **Apple App Store** and the **Google Play Store** using Capacitor.

---

## How It Works

UniTracker uses [Capacitor](https://capacitorjs.com/) as a native shell. The app loads your deployed Next.js website (e.g., `https://uni-work-tracker.vercel.app`) in a native WebView on iOS and Android. All features, data, and authentication remain server-side — no backend changes are needed.

> **Note:** Before building, make sure your production Vercel deployment is live and working, and that `capacitor.config.ts` points to your correct URL.

---

## Prerequisites

### Both Platforms
- [Node.js](https://nodejs.org/) installed
- Your Next.js app deployed to Vercel (or another host)
- Run `npm install` in the project root

### iOS
- A **Mac** with macOS 13+ (Xcode cannot run on Windows)
- [Xcode 15+](https://developer.apple.com/xcode/) installed (free from App Store)
- [CocoaPods](https://cocoapods.org/) installed: `sudo gem install cocoapods`
- An **Apple Developer account** — [enroll here](https://developer.apple.com/programs/) ($99 USD/year)

### Android
- [Android Studio](https://developer.android.com/studio) installed (free)
- A **Google Play Developer account** — [enroll here](https://play.google.com/apps/publish/) (one-time $25 USD fee)
- Java JDK 17+ (bundled with Android Studio)

---

## Step 1 — Update capacitor.config.ts

Ensure the `server.url` is your live production URL:

```ts
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.lucas.unitracker',
  appName: 'UniTracker',          // ← this appears as the app name on device
  webDir: 'out',
  server: {
    url: 'https://your-vercel-app.vercel.app',  // ← replace with YOUR URL
    cleartext: true
  }
};
```

---

## Step 2 — Sync Capacitor

Every time you change `capacitor.config.ts` or add a Capacitor plugin, run:

```bash
npx cap sync
```

This copies the config into both `android/` and `ios/` native folders.

---

## 📱 iOS — App Store Submission

### Step 3A — Open in Xcode

```bash
npx cap open ios
```

This opens the `ios/App/` project in Xcode.

### Step 4A — Configure Signing

1. In Xcode, click on **App** in the project navigator.
2. Under **Signing & Capabilities** → **Team**, select your Apple Developer account.
3. Xcode will automatically manage your provisioning profile and signing certificate.

### Step 5A — Set App Version

- In Xcode: **App** → **General** → set **Version** (e.g., `1.0.0`) and **Build** number (e.g., `1`).

### Step 6A — Set App Icon

Replace the default icon in Xcode with your own:
- Go to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Provide the following sizes (PNG format, no transparency, RGB):

| Size | Usage |
|------|-------|
| 1024×1024 | App Store listing |
| 180×180 | iPhone home screen (@3x) |
| 120×120 | iPhone home screen (@2x) |
| 60×60 | iPhone notification |
| 40×40 | Spotlight |
| 58×58 | Settings |

> Tip: use [AppIcon.co](https://www.appicon.co) — upload your 1024×1024 and it generates all sizes.

### Step 7A — Test on Simulator

In Xcode, select an iPhone simulator from the device picker and press ▶ Play. Verify:
- App loads the web dashboard correctly
- Finance tab is **not** visible (it's hidden in native mode)
- Hamburger menu opens/closes smoothly
- Login and all tabs work

### Step 8A — Archive for Distribution

1. Set the target device to **Any iOS Device (arm64)** (not a simulator)
2. Menu: **Product → Archive**
3. Once done, **Xcode Organizer** opens automatically.
4. Click **Distribute App** → **App Store Connect** → **Upload**
5. Follow the prompts (keep defaults for most options)

### Step 9A — Submit on App Store Connect

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to **My Apps** → **+** → **New App**
3. Fill in:
   - **Name:** UniTracker
   - **Bundle ID:** `com.lucas.unitracker`
   - **SKU:** `unitracker-001`
   - **Primary Language:** English (Australia)
4. Under **App Information**, complete the description, keywords, and category (Education or Productivity)
5. Upload **screenshots** (see required sizes below)
6. Under **TestFlight**, test the uploaded build on a real device
7. Submit for **App Review** — Apple typically reviews within 1–3 days

### iOS Screenshot Requirements

| Device | Size |
|--------|------|
| iPhone 6.7" (required) | 1290 × 2796 px |
| iPhone 6.5" | 1242 × 2688 px |
| iPhone 5.5" | 1242 × 2208 px |
| iPad Pro 12.9" (if iPad support) | 2048 × 2732 px |

Use iOS Simulator + `File → Take Screenshot` in Xcode to capture screens.

---

## 🤖 Android — Google Play Submission

### Step 3B — Open in Android Studio

```bash
npx cap open android
```

### Step 4B — Set App ID and Version

In `android/app/build.gradle`:
```gradle
defaultConfig {
    applicationId "com.lucas.unitracker"
    versionCode 1
    versionName "1.0.0"
    ...
}
```

### Step 5B — Set App Icon

Replace the default icons in `android/app/src/main/res/`:

| Folder | Size |
|--------|------|
| `mipmap-hdpi/` | 72×72 |
| `mipmap-mdpi/` | 48×48 |
| `mipmap-xhdpi/` | 96×96 |
| `mipmap-xxhdpi/` | 144×144 |
| `mipmap-xxxhdpi/` | 192×192 |

> Tip: use [Asset Studio](https://developer.android.com/studio/write/image-asset-studio) inside Android Studio — **File → New → Image Asset**.

### Step 6B — Test on Emulator

In Android Studio, use **AVD Manager** to create a Pixel 8 emulator and run the app. Verify the same things as iOS.

### Step 7B — Build Signed AAB

1. **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle (.aab)** (required for Play Store)
3. Create a new **keystore** (save this file safely — you need it forever to update the app):
   - Key alias: `unitracker-key`
   - Validity: 25 years
4. Build a **Release** AAB
5. The `.aab` file will be in `android/app/release/`

### Step 8B — Submit on Google Play Console

1. Log in to [Google Play Console](https://play.google.com/console)
2. **Create app** → fill in name, default language, app type (App), category (Education)
3. Under **Production** → **Create new release** → Upload your `.aab` file
4. Complete the **Store Listing**:
   - App name: UniTracker
   - Short description (max 80 chars)
   - Full description (max 4000 chars)
   - Upload **screenshots** and a **feature graphic** (1024×500 px)
5. Complete **App Content** (data safety, ads, ratings questionnaire)
6. Submit for review — Google typically reviews within 1–7 days

### Android Screenshot Requirements

| Type | Size |
|------|------|
| Phone (required) | 1080 × 1920 px minimum |
| 7-inch tablet (optional) | 1200 × 1920 px |
| 10-inch tablet (optional) | 1920 × 1200 px |
| Feature Graphic | 1024 × 500 px |

---

## App Store Listing — Suggested Copy

### App Name
**UniTracker**

### Subtitle (iOS only)
Your university, organised.

### App Description
```
UniTracker is your all-in-one university management hub. Keep on top of your courses, assignments, notes, and calendar — all in one beautifully designed app.

• Track assignments with due dates, grades, and weights across all your courses
• Sync with Canvas LMS to automatically import your courses and tasks
• Generate AI-powered notes and quizzes from your course material
• Full calendar view showing all your upcoming deadlines
• Dark mode support for late-night studying
• Secure per-account data with university email login
```

### Keywords (iOS)
university, student, assignments, grades, calendar, notes, quiz, canvas, study, unitracker

### Category
Education → Reference

---

## Future Updates

After the app is live, to release updates:
1. Increment the version number in `capacitor.config.ts` (for display) and in Xcode/Gradle build settings.
2. Run `npx cap sync` to update native projects.
3. Archive/build and upload the new version through App Store Connect or Play Console.

---

## Support Links You'll Need

| Resource | Link |
|----------|------|
| Apple Developer Program | https://developer.apple.com/programs/ |
| App Store Connect | https://appstoreconnect.apple.com |
| Google Play Console | https://play.google.com/console |
| Capacitor Docs | https://capacitorjs.com/docs |
| AppIcon Generator | https://www.appicon.co |
| iOS Screenshot Tool | Xcode Simulator → File → Take Screenshot |
