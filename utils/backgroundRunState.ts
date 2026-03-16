import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunSettings, LocationPoint } from '../types/location';

const BG_RUN_STATE_KEY = 'pacemaker-bg-run-state';

export interface BackgroundRunState {
  startTime: number;              // Date.now() when run started
  targetPace: number;             // min/km
  settings: RunSettings;
  lastFeedbackTime: number;       // elapsed seconds at last feedback
  lastFeedbackDistance: number;    // km at last feedback
  totalDistance: number;           // km accumulated so far
  isAppInForeground: boolean;
  totalPausedDuration: number;    // ms of total paused time
  lastLocationPoint: LocationPoint | null; // last known valid GPS point
}

export async function saveBackgroundRunState(
  state: BackgroundRunState
): Promise<void> {
  try {
    await AsyncStorage.setItem(BG_RUN_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving background run state:', e);
  }
}

export async function getBackgroundRunState(): Promise<BackgroundRunState | null> {
  try {
    const stored = await AsyncStorage.getItem(BG_RUN_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading background run state:', e);
  }
  return null;
}

export async function clearBackgroundRunState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BG_RUN_STATE_KEY);
  } catch (e) {
    console.error('Error clearing background run state:', e);
  }
}

export async function updateBackgroundRunField<K extends keyof BackgroundRunState>(
  key: K,
  value: BackgroundRunState[K]
): Promise<void> {
  const state = await getBackgroundRunState();
  if (state) {
    state[key] = value;
    await saveBackgroundRunState(state);
  }
}

export async function updateBackgroundRunFields(
  updates: Partial<BackgroundRunState>
): Promise<void> {
  const state = await getBackgroundRunState();
  if (state) {
    await saveBackgroundRunState({ ...state, ...updates });
  }
}
