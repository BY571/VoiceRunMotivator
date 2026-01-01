# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pacemaker is a React Native/Expo app that provides real-time GPS-based pace feedback during runs. Users set a distance and time goal, and the app tracks their actual position via GPS and speaks feedback about whether they're on pace, behind, or ahead.

## Development Commands

```bash
npm start              # Start Expo development server
npm run android        # Run on Android
npm run ios            # Run on iOS
npm run web            # Run on web (limited GPS support)
npm test               # Run tests in watch mode
```

## Architecture

### App Structure (Expo Router)

Uses file-based routing via `expo-router`:
- `app/_layout.tsx` - Root layout, registers background location task
- `app/(tabs)/index.tsx` - Goal setup screen (distance/time input, target pace display)
- `app/run-screen.tsx` - Active run screen with GPS tracking and voice feedback
- `app/settings.tsx` - Configuration for feedback intervals (time or distance-based)

### Core Data Flow

1. User enters target distance (km) and time (minutes) on goal screen
2. Target pace calculated and displayed in real-time
3. On "Start Run", GPS permissions requested and tracking begins
4. Real GPS coordinates collected via `expo-location` with background support
5. Distance calculated using Haversine formula between GPS points
6. Voice feedback triggered at configurable intervals via `expo-speech`
7. Settings persisted to AsyncStorage under key `'runSettings'`

### Key Files

**Types & Utilities:**
- `types/location.ts` - `LocationPoint`, `RunSettings` interfaces, defaults
- `utils/haversine.ts` - GPS distance calculation, pace formatting, accuracy filtering
- `utils/locationService.ts` - Location permissions, background task, event emitter

**Constants:**
- `constants/paceFeedbackPhrases.ts` - Neutral feedback phrases for `onPace`, `behind`, `ahead`

### GPS & Background Tracking

- Uses `expo-location` with `expo-task-manager` for background updates
- Background task defined in `utils/locationService.ts`, registered in `app/_layout.tsx`
- Location updates emitted via `locationEventEmitter` to run screen
- Accuracy filtering: rejects readings > 20m accuracy or < 2m movement (GPS jitter)

### Settings (AsyncStorage)

```typescript
{
  feedbackTriggerMode: 'time' | 'distance',
  feedbackTimeInterval: number,      // seconds (default: 30)
  feedbackDistanceInterval: number,  // km (default: 0.5)
  checkpointInterval: number         // km (default: 1.0)
}
```

### Path Alias

`@/*` maps to project root (configured in tsconfig.json).

### Permissions Required

- iOS: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`
- Android: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`
