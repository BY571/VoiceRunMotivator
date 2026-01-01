import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import * as Speech from 'expo-speech';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { LocationPoint, RunSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from '../types/location';
import {
  calculateTotalDistance,
  isValidLocationUpdate,
  calculatePaceMinPerKm,
  formatPace,
  formatElapsedTime,
} from '../utils/haversine';
import {
  requestLocationPermissions,
  startLocationTracking,
  stopLocationTracking,
  locationEventEmitter,
  getCurrentLocation,
} from '../utils/locationService';
import { getRandomFeedback, PaceFeedbackType } from '../constants/paceFeedbackPhrases';

type RunState = 'waiting' | 'running' | 'paused' | 'finished';

export default function RunScreen() {
  const router = useRouter();
  const { targetDistance, targetTime } = useLocalSearchParams<{
    targetDistance: string;
    targetTime: string;
  }>();

  const targetDistNum = parseFloat(targetDistance);
  const targetTimeNum = parseFloat(targetTime);
  const targetPaceMinPerKm = targetTimeNum / targetDistNum;

  // Run state
  const [runState, setRunState] = useState<RunState>('waiting');
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [settings, setSettings] = useState<RunSettings>(DEFAULT_SETTINGS);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'acquired' | 'poor'>('searching');
  const [lastFeedback, setLastFeedback] = useState('');

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFeedbackTimeRef = useRef(0);
  const lastFeedbackDistanceRef = useRef(0);
  const lastCheckpointDistanceRef = useRef(0);
  const locationPointsRef = useRef<LocationPoint[]>([]);

  // Load settings on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_KEY);
        if (saved) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
        }
      } catch {
        // Use defaults
      }
    })();
  }, []);

  // Validate params
  useEffect(() => {
    if (!targetDistance || !targetTime) {
      Alert.alert('Error', 'Missing target distance and time', [
        { text: 'Go Back', onPress: () => router.back() },
      ]);
      return;
    }
    if (isNaN(targetDistNum) || isNaN(targetTimeNum) || targetDistNum <= 0 || targetTimeNum <= 0) {
      Alert.alert('Error', 'Invalid target values', [
        { text: 'Go Back', onPress: () => router.back() },
      ]);
    }
  }, [targetDistance, targetTime]);

  // Keep screen awake during run
  useEffect(() => {
    if (runState === 'running') {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
    return () => {
      deactivateKeepAwake();
    };
  }, [runState]);

  // Timer for elapsed time
  useEffect(() => {
    if (runState === 'running') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [runState]);

  // Location tracking
  useEffect(() => {
    if (runState !== 'running') return;

    const unsubscribe = locationEventEmitter.addListener((point: LocationPoint) => {
      const lastPoint = locationPointsRef.current[locationPointsRef.current.length - 1] || null;

      if (isValidLocationUpdate(point, lastPoint)) {
        locationPointsRef.current = [...locationPointsRef.current, point];
        setLocationPoints([...locationPointsRef.current]);
        const newDistance = calculateTotalDistance(locationPointsRef.current);
        setTotalDistance(newDistance);
        setGpsStatus('acquired');

        // Check if run is complete
        if (newDistance >= targetDistNum) {
          handleFinishRun();
        }
      } else if (point.accuracy && point.accuracy > 20) {
        setGpsStatus('poor');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [runState, targetDistNum]);

  // Voice feedback logic
  useEffect(() => {
    if (runState !== 'running' || totalDistance === 0) return;

    const shouldGivePaceFeedback = (): boolean => {
      if (settings.feedbackTriggerMode === 'time') {
        const secondsSinceLastFeedback = elapsedSeconds - lastFeedbackTimeRef.current;
        return secondsSinceLastFeedback >= settings.feedbackTimeInterval;
      } else {
        const distanceSinceLastFeedback = totalDistance - lastFeedbackDistanceRef.current;
        return distanceSinceLastFeedback >= settings.feedbackDistanceInterval;
      }
    };

    const givePaceFeedback = async () => {
      if (!shouldGivePaceFeedback()) return;

      lastFeedbackTimeRef.current = elapsedSeconds;
      lastFeedbackDistanceRef.current = totalDistance;

      // Determine pace status
      const currentPace = calculatePaceMinPerKm(totalDistance, elapsedSeconds);
      let paceType: PaceFeedbackType;

      if (currentPace === null) {
        paceType = 'onPace';
      } else {
        const paceDiff = currentPace - targetPaceMinPerKm;
        if (Math.abs(paceDiff) < 0.1) {
          paceType = 'onPace';
        } else if (paceDiff > 0) {
          paceType = 'behind'; // Higher pace number = slower
        } else {
          paceType = 'ahead';
        }
      }

      const message = getRandomFeedback(paceType);
      setLastFeedback(message);

      try {
        await Speech.stop();
        await Speech.speak(message, {
          language: 'en-US',
          rate: 0.9,
          pitch: 1.0,
          volume: 1.0,
        });
      } catch {
        // Ignore speech errors
      }
    };

    givePaceFeedback();
  }, [elapsedSeconds, totalDistance, runState, settings, targetPaceMinPerKm]);

  // Checkpoint announcements (distance-based)
  useEffect(() => {
    if (runState !== 'running' || totalDistance === 0) return;

    const nextCheckpoint =
      Math.floor(totalDistance / settings.checkpointInterval) * settings.checkpointInterval;

    if (nextCheckpoint > lastCheckpointDistanceRef.current && nextCheckpoint > 0) {
      lastCheckpointDistanceRef.current = nextCheckpoint;

      const timeStr = formatElapsedTime(elapsedSeconds);
      const message = `${nextCheckpoint.toFixed(1)} kilometers. Time: ${timeStr}`;

      Speech.stop().then(() => {
        Speech.speak(message, {
          language: 'en-US',
          rate: 0.9,
          pitch: 1.0,
          volume: 1.0,
        });
      });
    }
  }, [totalDistance, runState, settings.checkpointInterval, elapsedSeconds]);

  const handleStartRun = useCallback(async () => {
    const permissions = await requestLocationPermissions();

    if (!permissions.foreground) {
      Alert.alert(
        'Location Required',
        'Pacemaker needs location permission to track your run.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!permissions.background) {
      Alert.alert(
        'Background Location',
        'For best experience, allow background location so tracking continues when your phone is in your pocket.',
        [{ text: 'Continue Anyway', onPress: startRun }]
      );
      return;
    }

    startRun();
  }, []);

  const startRun = async () => {
    setGpsStatus('searching');

    // Get initial position
    const initialPos = await getCurrentLocation();
    if (initialPos) {
      locationPointsRef.current = [initialPos];
      setLocationPoints([initialPos]);
      setGpsStatus('acquired');
    }

    await startLocationTracking();
    setRunState('running');

    // Initial voice prompt
    Speech.speak("Run started. Let's go!", {
      language: 'en-US',
      rate: 0.9,
    });
  };

  const handleFinishRun = useCallback(async () => {
    setRunState('finished');
    await stopLocationTracking();

    const finalTime = formatElapsedTime(elapsedSeconds);
    const message = `Run complete! You covered ${totalDistance.toFixed(2)} kilometers in ${finalTime}.`;

    Speech.speak(message, {
      language: 'en-US',
      rate: 0.9,
    });
  }, [elapsedSeconds, totalDistance]);

  const handleStopRun = useCallback(async () => {
    Alert.alert('Stop Run', 'Are you sure you want to stop?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          setRunState('finished');
          await stopLocationTracking();
          Speech.speak('Run stopped.', { language: 'en-US' });
        },
      },
    ]);
  }, []);

  const handleGoBack = useCallback(() => {
    stopLocationTracking();
    router.back();
  }, [router]);

  // Calculate current pace
  const currentPace = calculatePaceMinPerKm(totalDistance, elapsedSeconds);
  const progressPercent = Math.min((totalDistance / targetDistNum) * 100, 100);

  return (
    <View style={styles.container}>
      {/* GPS Status */}
      <View style={[styles.gpsIndicator, styles[`gps_${gpsStatus}`]]}>
        <Text style={styles.gpsText}>
          GPS: {gpsStatus === 'searching' ? 'Searching...' : gpsStatus === 'acquired' ? 'OK' : 'Poor Signal'}
        </Text>
      </View>

      {/* Main Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.mainStat}>
          <Text style={styles.mainStatValue}>{totalDistance.toFixed(2)}</Text>
          <Text style={styles.mainStatLabel}>km</Text>
        </View>

        <View style={styles.secondaryStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatElapsedTime(elapsedSeconds)}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatPace(currentPace)}</Text>
            <Text style={styles.statLabel}>Pace (min/km)</Text>
          </View>
        </View>

        <View style={styles.targetInfo}>
          <Text style={styles.targetText}>
            Target: {targetDistNum} km in {targetTimeNum} min ({formatPace(targetPaceMinPerKm)} /km)
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>{progressPercent.toFixed(0)}%</Text>
        </View>
      </View>

      {/* Feedback Display */}
      {lastFeedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>{lastFeedback}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {runState === 'waiting' && (
          <Pressable style={styles.startButton} onPress={handleStartRun}>
            <Text style={styles.startButtonText}>START RUN</Text>
          </Pressable>
        )}

        {runState === 'running' && (
          <Pressable style={styles.stopButton} onPress={handleStopRun}>
            <Text style={styles.stopButtonText}>STOP</Text>
          </Pressable>
        )}

        {runState === 'finished' && (
          <Pressable style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>BACK TO HOME</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 60,
  },
  gpsIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  gps_searching: {
    backgroundColor: '#ffa500',
  },
  gps_acquired: {
    backgroundColor: '#4CAF50',
  },
  gps_poor: {
    backgroundColor: '#f44336',
  },
  gpsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  mainStat: {
    alignItems: 'center',
    marginBottom: 30,
  },
  mainStatValue: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  mainStatLabel: {
    fontSize: 24,
    color: '#888',
    marginTop: -10,
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  targetInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  targetText: {
    fontSize: 14,
    color: '#888',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  progressText: {
    color: '#888',
    fontSize: 14,
    width: 40,
    textAlign: 'right',
  },
  feedbackContainer: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  feedbackText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingBottom: 40,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  stopButton: {
    backgroundColor: '#f44336',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#666',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
