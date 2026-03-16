import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationPoint } from '../types/location';
import { isValidLocationUpdate, haversineDistance, calculatePaceMinPerKm, determinePaceStatus } from './haversine';
import { getBackgroundRunState, saveBackgroundRunState, BackgroundRunState } from './backgroundRunState';
import { sendPaceNotification } from './notificationService';
import { getRandomFeedback } from '../constants/paceFeedbackPhrases';

export const LOCATION_TASK_NAME = 'pacemaker-background-location';
export const BACKGROUND_LOCATIONS_KEY = 'pacemaker-background-locations';

// Event emitter for location updates (foreground)
type LocationCallback = (point: LocationPoint) => void;

class LocationEventEmitter {
  private listeners: LocationCallback[] = [];

  addListener(callback: LocationCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  emit(data: LocationPoint): void {
    this.listeners.forEach((callback) => callback(data));
  }

  clear(): void {
    this.listeners = [];
  }
}

export const locationEventEmitter = new LocationEventEmitter();

/**
 * Get and clear background locations stored while app was backgrounded
 */
export async function getBackgroundLocations(): Promise<LocationPoint[]> {
  try {
    const stored = await AsyncStorage.getItem(BACKGROUND_LOCATIONS_KEY);
    if (stored) {
      await AsyncStorage.removeItem(BACKGROUND_LOCATIONS_KEY);
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading background locations:', e);
  }
  return [];
}

/**
 * Clear stored background locations
 */
export async function clearBackgroundLocations(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BACKGROUND_LOCATIONS_KEY);
  } catch (e) {
    console.error('Error clearing background locations:', e);
  }
}

/**
 * Request foreground and background location permissions
 */
export async function requestLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  // Request foreground permission first
  const { status: foregroundStatus } =
    await Location.requestForegroundPermissionsAsync();
  const foregroundGranted = foregroundStatus === 'granted';

  if (!foregroundGranted) {
    return { foreground: false, background: false };
  }

  // Then request background permission
  const { status: backgroundStatus } =
    await Location.requestBackgroundPermissionsAsync();
  const backgroundGranted = backgroundStatus === 'granted';

  return { foreground: foregroundGranted, background: backgroundGranted };
}

/**
 * Check if location permissions are granted
 */
export async function checkLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();

  return {
    foreground: foreground.status === 'granted',
    background: background.status === 'granted',
  };
}

/**
 * Start background location tracking
 */
export async function startLocationTracking(): Promise<void> {
  const isTracking = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  );
  if (isTracking) {
    return; // Already tracking
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 1000, // Update every 1 second minimum
    distanceInterval: 5, // Or every 5 meters
    deferredUpdatesInterval: 1000,
    deferredUpdatesDistance: 5,
    foregroundService: {
      notificationTitle: 'Pacemaker',
      notificationBody: 'Tracking your run...',
      notificationColor: '#2196F3',
    },
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Fitness,
  });
}

/**
 * Stop background location tracking
 */
export async function stopLocationTracking(): Promise<void> {
  const isTracking = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  );
  if (isTracking) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

/**
 * Get current location (single shot)
 */
export async function getCurrentLocation(): Promise<LocationPoint | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy,
    };
  } catch {
    return null;
  }
}

/**
 * Define the background task - must be called at app startup
 */
export function defineBackgroundTask(): void {
  TaskManager.defineTask(
    LOCATION_TASK_NAME,
    async ({
      data,
      error,
    }: {
      data: { locations: Location.LocationObject[] } | null;
      error: TaskManager.TaskManagerError | null;
    }) => {
      if (error) {
        console.error('Background location error:', error);
        return;
      }

      if (data?.locations) {
        const newPoints: LocationPoint[] = data.locations.map((location) => ({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          accuracy: location.coords.accuracy,
        }));

        // Emit for foreground listeners
        newPoints.forEach((point) => {
          locationEventEmitter.emit(point);
        });

        // Store in AsyncStorage for when app returns to foreground
        try {
          const existing = await AsyncStorage.getItem(BACKGROUND_LOCATIONS_KEY);
          const existingPoints: LocationPoint[] = existing ? JSON.parse(existing) : [];
          const allPoints = [...existingPoints, ...newPoints];
          const trimmedPoints = allPoints.slice(-1000);
          await AsyncStorage.setItem(BACKGROUND_LOCATIONS_KEY, JSON.stringify(trimmedPoints));
        } catch (e) {
          console.error('Error storing background location:', e);
        }

        // Calculate incremental distance and handle background notifications
        try {
          const runState = await getBackgroundRunState();
          if (!runState || runState.isAppInForeground) return;

          // Filter valid points and calculate incremental distance
          let lastPoint = runState.lastLocationPoint;
          let incrementalDistance = 0;

          for (const point of newPoints) {
            if (isValidLocationUpdate(point, lastPoint)) {
              if (lastPoint) {
                incrementalDistance += haversineDistance(
                  lastPoint.latitude, lastPoint.longitude,
                  point.latitude, point.longitude
                );
              }
              lastPoint = point;
            }
          }

          const newTotalDistance = runState.totalDistance + incrementalDistance;

          const updatedState: BackgroundRunState = {
            ...runState,
            totalDistance: newTotalDistance,
            lastLocationPoint: lastPoint,
          };
          await saveBackgroundRunState(updatedState);

          // Check if pace feedback should be sent
          await maybeSendPaceNotification(updatedState);
        } catch (e) {
          console.error('Error in background location processing:', e);
        }
      }
    }
  );
}

/**
 * Check if pace feedback should be sent from the background task.
 * Uses voice (Speech) for audible feedback plus a notification as visual backup.
 * Only fires when the app is NOT in the foreground and a feedback interval has elapsed.
 */
async function maybeSendPaceNotification(runState: BackgroundRunState): Promise<void> {
  try {
    if (runState.isAppInForeground) return;

    const totalDistance = runState.totalDistance;
    const elapsedMs = Date.now() - runState.startTime - runState.totalPausedDuration;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    if (elapsedSeconds <= 0 || totalDistance <= 0) return;

    // Check if feedback interval has been reached
    let shouldNotify = false;
    if (runState.settings.feedbackTriggerMode === 'time') {
      shouldNotify = (elapsedSeconds - runState.lastFeedbackTime) >= runState.settings.feedbackTimeInterval;
    } else {
      shouldNotify = (totalDistance - runState.lastFeedbackDistance) >= runState.settings.feedbackDistanceInterval;
    }

    if (!shouldNotify) return;

    // Calculate pace and build feedback message
    const currentPace = calculatePaceMinPerKm(totalDistance, elapsedSeconds);
    const paceType = determinePaceStatus(currentPace, runState.targetPace);
    const message = getRandomFeedback(paceType);

    // Voice feedback (works on iOS with audio background mode + Android foreground service)
    try {
      await Speech.stop();
      Speech.speak(message, {
        language: 'en-US',
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
      });
    } catch {
      // Speech may not be available in headless context — notification handles it
    }

    // Also send notification as visual/vibration backup
    await sendPaceNotification(message);

    // Update feedback markers
    await saveBackgroundRunState({
      ...runState,
      lastFeedbackTime: elapsedSeconds,
      lastFeedbackDistance: totalDistance,
    });
  } catch (e) {
    console.error('Error in background pace notification:', e);
  }
}
