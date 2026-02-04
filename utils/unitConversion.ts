import { DistanceUnit } from '../types/location';
import { formatPace } from './haversine';

const KM_TO_MILES = 0.621371;
const MILES_TO_KM = 1.60934;

export function kmToMiles(km: number): number {
  return km * KM_TO_MILES;
}

export function milesToKm(miles: number): number {
  return miles * MILES_TO_KM;
}

/** Convert an internal km value to the display unit */
export function convertDistanceForDisplay(km: number, unit: DistanceUnit): number {
  return unit === 'miles' ? kmToMiles(km) : km;
}

/** Convert a user-entered value in the chosen unit back to km */
export function convertDistanceToKm(value: number, unit: DistanceUnit): number {
  return unit === 'miles' ? milesToKm(value) : value;
}

/** Format pace string in the chosen unit (e.g. "5:30") */
export function formatPaceForUnit(paceMinPerKm: number | null, unit: DistanceUnit): string {
  if (paceMinPerKm === null || !isFinite(paceMinPerKm)) {
    return '--:--';
  }
  if (unit === 'miles') {
    // Convert min/km to min/mile
    const paceMinPerMile = paceMinPerKm * MILES_TO_KM;
    return formatPace(paceMinPerMile);
  }
  return formatPace(paceMinPerKm);
}

export function getUnitLabel(unit: DistanceUnit): string {
  return unit === 'miles' ? 'mi' : 'km';
}

export function getUnitLabelPlural(unit: DistanceUnit): string {
  return unit === 'miles' ? 'miles' : 'kilometers';
}
