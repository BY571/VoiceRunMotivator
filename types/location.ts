export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
}

export interface RunSettings {
  feedbackTriggerMode: 'time' | 'distance';
  feedbackTimeInterval: number;      // seconds (e.g., 30)
  feedbackDistanceInterval: number;  // km (e.g., 0.5)
  checkpointInterval: number;        // km (e.g., 1.0)
  autoStopOnGoal: boolean;           // true = stop when goal reached, false = continue until manual stop
}

export const DEFAULT_SETTINGS: RunSettings = {
  feedbackTriggerMode: 'time',
  feedbackTimeInterval: 30,
  feedbackDistanceInterval: 0.5,
  checkpointInterval: 1.0,
  autoStopOnGoal: true,
};

export const SETTINGS_KEY = 'runSettings';
