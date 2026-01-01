# Pacemaker

A lightweight running app that provides real-time voice feedback on your pace. Set your distance and time goals, and Pacemaker will track your GPS position and tell you whether you're on pace, ahead, or behind your target.

## Features

- **Real-time GPS tracking** - Accurate distance measurement using your phone's GPS
- **Voice feedback** - Audio updates on your pace status while you run
- **Background operation** - Keeps tracking even when your phone is in your pocket
- **Flexible feedback modes** - Choose between time-based (every X seconds) or distance-based (every X km) updates
- **Target pace calculator** - See your required pace as you set your goals
- **Clean, dark UI** - Easy to read outdoors

## Quick Start

### Using Expo Go (Development)

1. Install [Expo Go](https://expo.dev/client) on your phone
2. Clone this repository
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Scan the QR code with Expo Go

### Building for Your Phone

For a standalone app that doesn't require Expo Go:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android (APK for direct install)
eas build --platform android --profile preview

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile preview
```

## Usage

1. **Set your goal**: Enter your target distance (km) and time (minutes)
2. **Check your pace**: The target pace is calculated automatically
3. **Configure settings** (optional): Tap the gear icon to adjust:
   - Feedback mode: time-based or distance-based
   - Feedback interval: how often you hear updates
   - Checkpoint interval: when to announce distance milestones
4. **Start your run**: Tap "START RUN" and grant location permissions
5. **Run!** You'll hear voice feedback as you go

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Feedback Mode | Time-based or distance-based updates | Time-based |
| Time Interval | Seconds between pace updates | 30s |
| Distance Interval | Kilometers between pace updates | 0.5 km |
| Checkpoint Interval | Kilometers between time announcements | 1.0 km |

## Permissions

The app requires location permissions to track your run:
- **Foreground location**: To track while the app is open
- **Background location**: To continue tracking when your phone is locked or in your pocket

## Development

```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm test           # Run tests
```

## Publishing to Google Play Store

See [PUBLISHING.md](./PUBLISHING.md) for detailed instructions on publishing to the Google Play Store.

## Tech Stack

- React Native / Expo
- expo-location (GPS tracking)
- expo-task-manager (background tasks)
- expo-speech (voice feedback)
- expo-router (navigation)

## License

MIT
