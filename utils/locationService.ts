import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LocationPoint } from '../types/location';

export const LOCATION_TASK_NAME = 'pacemaker-background-location';

// Event emitter for location updates
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
        data.locations.forEach((location) => {
          locationEventEmitter.emit({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy,
          });
        });
      }
    }
  );
}
