# Publishing to Google Play Store

This guide walks you through publishing Pacemaker to the Google Play Store using Expo Application Services (EAS).

## Quick Checklist

Use this checklist to track your progress:

- [ ] **1. Prerequisites**
  - [ ] Google Play Developer Account ($25) - https://play.google.com/console/signup
  - [ ] Expo account created and logged in (`npx eas whoami`)

- [ ] **2. Test on Your Phone**
  - [ ] Build preview APK: `npx eas build --platform android --profile preview`
  - [ ] Install and test the app on your device

- [ ] **3. Prepare Store Assets**
  - [ ] Take 2-8 screenshots of the app
  - [ ] Create privacy policy and host it (GitHub Pages works)

- [ ] **4. Build for Production**
  - [ ] Build AAB: `npx eas build --platform android --profile production`
  - [ ] Download the AAB file

- [ ] **5. Google Play Console Setup**
  - [ ] Create new app in Play Console
  - [ ] Fill in store listing (name, descriptions, screenshots)
  - [ ] Complete content rating questionnaire
  - [ ] Complete data safety form
  - [ ] Add privacy policy URL

- [ ] **6. Release**
  - [ ] Upload AAB to Production track
  - [ ] Add release notes
  - [ ] Submit for review

---

## Prerequisites

1. **Google Play Developer Account** ($25 one-time fee)
   - Sign up at: https://play.google.com/console/signup

2. **Expo Account** (free)
   - Sign up at: https://expo.dev/signup

3. **EAS CLI**
   ```bash
   npm install -g eas-cli
   eas login
   ```

## Step 1: Configure EAS Build

The `eas.json` file is already configured. Key profiles:

- `preview`: Creates an APK for testing on your device
- `production`: Creates an AAB (Android App Bundle) for Play Store

## Step 2: Build for Testing

First, test on your own device:

```bash
# Build APK for direct installation
eas build --platform android --profile preview
```

Download the APK from the link provided and install it on your phone.

## Step 3: Build for Production

When ready for Play Store:

```bash
# Build AAB for Play Store
eas build --platform android --profile production
```

## Step 4: Create Play Store Listing

1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in:
   - App name: **Pacemaker**
   - Default language: English
   - App or game: App
   - Free or paid: Free

## Step 5: Store Listing Details

### Short Description (80 chars max)
```
Voice-guided running coach. Set pace goals, get real-time audio feedback.
```

### Full Description
```
Pacemaker is your personal running coach that provides real-time voice feedback on your pace.

HOW IT WORKS:
1. Set your distance and time goal (e.g., 5km in 25 minutes)
2. Start your run
3. Receive audio updates telling you if you're on pace, ahead, or behind

KEY FEATURES:
• Real-time GPS tracking with accurate distance measurement
• Voice feedback that works even when your phone is in your pocket
• Choose time-based (every 30 seconds) or distance-based (every 500m) updates
• Distance milestone announcements (every 1km)
• Clean, dark interface easy to read outdoors
• Lightweight and battery-efficient

PERFECT FOR:
• Runners training for specific pace goals
• Interval training
• Race preparation
• Anyone who wants audio feedback without looking at their phone

Pacemaker requires location permissions to track your run accurately. Background location is used to continue tracking when your screen is off.
```

### Category
Health & Fitness

### Screenshots Needed
- Phone screenshots (minimum 2, recommended 4-8)
- 7-inch tablet screenshots (optional)
- 10-inch tablet screenshots (optional)

## Step 6: Content Rating

Complete the content rating questionnaire. For this app:
- No violence
- No sexual content
- No profanity
- No user-generated content
- Collects location data

Expected rating: **Everyone**

## Step 7: App Privacy

### Data Safety Form

Declare the following:
- **Location data**: Collected for app functionality (running tracking)
  - Not shared with third parties
  - Not transferred to third parties
  - Required for app to function
  - Users cannot request deletion (data stays on device only)

### Privacy Policy

You need a privacy policy URL. Create a simple one stating:
- App collects location data only during active runs
- Data is stored only on the user's device
- No data is transmitted to external servers
- No personal information is collected

Host it on GitHub Pages or any static hosting.

## Step 8: Upload Your Build

1. In Play Console, go to "Production" → "Create new release"
2. Upload the AAB file from your EAS build
3. Add release notes:
   ```
   Initial release of Pacemaker - your voice-guided running coach.

   Features:
   - GPS-based distance tracking
   - Real-time voice pace feedback
   - Customizable feedback intervals
   - Background tracking support
   ```

## Step 9: Submit for Review

1. Complete all required sections (check marks should be green)
2. Click "Submit for review"
3. Review typically takes 1-3 days

## Updating the App

For future updates:

1. Update version in `app.json`:
   ```json
   {
     "expo": {
       "version": "1.1.0"
     }
   }
   ```

2. Build new AAB:
   ```bash
   eas build --platform android --profile production
   ```

3. Upload to Play Console and submit update

## Troubleshooting

### Build Fails
- Ensure you're logged in: `eas whoami`
- Check EAS build logs for specific errors

### App Rejected
Common reasons:
- Missing privacy policy
- Incomplete data safety form
- Screenshots don't match app functionality
- Background location not justified

### Location Not Working
- Ensure all permissions are declared in `app.json`
- Test on a real device (not emulator)
