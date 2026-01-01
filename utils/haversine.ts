import { LocationPoint } from '../types/location';

const EARTH_RADIUS_KM = 6371;
const MIN_ACCURACY_METERS = 20;
const MIN_DISTANCE_CHANGE_METERS = 2;
const MAX_SPEED_KMH = 50; // Reject impossibly fast movements

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate total distance from an array of location points
 * @returns Total distance in kilometers
 */
export function calculateTotalDistance(points: LocationPoint[]): number {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += haversineDistance(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude
    );
  }
  return totalDistance;
}

/**
 * Validate if a new location update should be accepted
 * Filters out inaccurate readings and GPS jitter
 */
export function isValidLocationUpdate(
  newPoint: LocationPoint,
  lastPoint: LocationPoint | null
): boolean {
  // Reject if accuracy is too poor
  if (newPoint.accuracy && newPoint.accuracy > MIN_ACCURACY_METERS) {
    return false;
  }

  // First point is always valid (if accuracy is acceptable)
  if (!lastPoint) {
    return true;
  }

  const distanceKm = haversineDistance(
    lastPoint.latitude,
    lastPoint.longitude,
    newPoint.latitude,
    newPoint.longitude
  );
  const distanceMeters = distanceKm * 1000;

  // Ignore tiny movements (GPS noise)
  if (distanceMeters < MIN_DISTANCE_CHANGE_METERS) {
    return false;
  }

  // Reject impossibly fast movements
  const timeDiffSeconds = (newPoint.timestamp - lastPoint.timestamp) / 1000;
  if (timeDiffSeconds > 0) {
    const speedKmh = (distanceKm / timeDiffSeconds) * 3600;
    if (speedKmh > MAX_SPEED_KMH) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate current pace in minutes per kilometer
 * @returns Pace in min/km or null if not enough data
 */
export function calculatePaceMinPerKm(
  distanceKm: number,
  elapsedSeconds: number
): number | null {
  if (distanceKm <= 0 || elapsedSeconds <= 0) {
    return null;
  }
  const elapsedMinutes = elapsedSeconds / 60;
  return elapsedMinutes / distanceKm;
}

/**
 * Format pace as "M:SS" string
 */
export function formatPace(paceMinPerKm: number | null): string {
  if (paceMinPerKm === null || !isFinite(paceMinPerKm)) {
    return '--:--';
  }
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format elapsed time as "M:SS" or "H:MM:SS" string
 */
export function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
