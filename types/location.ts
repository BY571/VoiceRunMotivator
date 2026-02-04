export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
}

export type DistanceUnit = 'km' | 'miles';

export interface RunSettings {
  feedbackTriggerMode: 'time' | 'distance';
  feedbackTimeInterval: number;      // seconds (e.g., 30)
  feedbackDistanceInterval: number;  // km (e.g., 0.5)
  checkpointInterval: number;        // km (e.g., 1.0)
  autoStopOnGoal: boolean;           // true = stop when goal reached, false = continue until manual stop
  distanceUnit: DistanceUnit;
}

export interface CompletedRun {
  id: string;
  date: string;                      // ISO string
  targetDistance: number;             // km
  targetTime: number;                // minutes
  actualDistance: number;             // km
  actualTime: number;                // seconds
  averagePace: number | null;        // min/km
  completedGoal: boolean;
}

export const DEFAULT_SETTINGS: RunSettings = {
  feedbackTriggerMode: 'time',
  feedbackTimeInterval: 30,
  feedbackDistanceInterval: 0.5,
  checkpointInterval: 1.0,
  autoStopOnGoal: true,
  distanceUnit: 'km',
};

export const SETTINGS_KEY = 'runSettings';
export const RUN_HISTORY_KEY = 'runHistory';
