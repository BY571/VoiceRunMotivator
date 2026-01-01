import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import * as Speech from 'expo-speech';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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

const COLORS = {
  background: '#0D0D0D',
  cardBg: '#1A1A1A',
  cardBorder: '#2A2A2A',
  accent: '#00D4AA',
  accentDim: '#00A888',
  text: '#FFFFFF',
  textSecondary: '#8A8A8A',
  textMuted: '#4A4A4A',
  success: '#00D4AA',
  warning: '#FFB800',
  danger: '#FF4757',
  ahead: '#00D4AA',
  behind: '#FF4757',
  onPace: '#00D4AA',
};

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
  const keepAwakeActiveRef = useRef(false);
  useEffect(() => {
    if (runState === 'running') {
      activateKeepAwakeAsync().then(() => {
        keepAwakeActiveRef.current = true;
      }).catch(() => {
        // Ignore errors on web
      });
    } else if (keepAwakeActiveRef.current) {
      try {
        deactivateKeepAwake();
        keepAwakeActiveRef.current = false;
      } catch {
        // Ignore errors on web
      }
    }
    return () => {
      if (keepAwakeActiveRef.current) {
        try {
          deactivateKeepAwake();
          keepAwakeActiveRef.current = false;
        } catch {
          // Ignore errors on web
        }
      }
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

  // Calculate current pace and pace status
  const currentPace = calculatePaceMinPerKm(totalDistance, elapsedSeconds);
  const progressPercent = Math.min((totalDistance / targetDistNum) * 100, 100);

  // Determine pace status for visual feedback
  const getPaceStatus = (): 'ahead' | 'onPace' | 'behind' => {
    if (!currentPace) return 'onPace';
    const paceDiff = currentPace - targetPaceMinPerKm;
    if (Math.abs(paceDiff) < 0.1) return 'onPace';
    return paceDiff > 0 ? 'behind' : 'ahead';
  };
  const paceStatus = getPaceStatus();

  return (
    <View style={styles.container}>
      {/* Header with GPS Status */}
      <View style={styles.header}>
        <View style={[styles.gpsIndicator, styles[`gps_${gpsStatus}`]]}>
          <View style={[styles.gpsDot, styles[`gpsDot_${gpsStatus}`]]} />
          <Text style={styles.gpsText}>
            {gpsStatus === 'searching' ? 'GPS' : gpsStatus === 'acquired' ? 'GPS' : 'GPS'}
          </Text>
        </View>
        <View style={styles.targetBadge}>
          <Text style={styles.targetBadgeText}>{formatPace(targetPaceMinPerKm)}/km</Text>
        </View>
      </View>

      {/* Main Distance Display */}
      <View style={styles.mainMetric}>
        <Text style={styles.mainMetricValue}>{totalDistance.toFixed(2)}</Text>
        <Text style={styles.mainMetricUnit}>kilometers</Text>
      </View>

      {/* Progress Ring/Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressPercent}>{progressPercent.toFixed(0)}%</Text>
          <Text style={styles.progressTarget}>{targetDistNum} km goal</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <FontAwesome name="clock-o" size={18} color={COLORS.textSecondary} />
          <Text style={styles.statValue}>{formatElapsedTime(elapsedSeconds)}</Text>
          <Text style={styles.statLabel}>TIME</Text>
        </View>
        <View style={[styles.statCard, styles.statCardAccent]}>
          <FontAwesome name="tachometer" size={18} color={COLORS[paceStatus]} />
          <Text style={[styles.statValue, { color: COLORS[paceStatus] }]}>
            {formatPace(currentPace)}
          </Text>
          <Text style={styles.statLabel}>PACE /KM</Text>
        </View>
      </View>

      {/* Pace Status Indicator */}
      {runState === 'running' && currentPace && (
        <View style={[styles.paceStatusCard, styles[`paceStatus_${paceStatus}`]]}>
          <FontAwesome
            name={paceStatus === 'ahead' ? 'arrow-up' : paceStatus === 'behind' ? 'arrow-down' : 'check'}
            size={20}
            color={COLORS[paceStatus]}
          />
          <Text style={[styles.paceStatusText, { color: COLORS[paceStatus] }]}>
            {paceStatus === 'ahead' ? 'Ahead of pace' : paceStatus === 'behind' ? 'Behind pace' : 'On target'}
          </Text>
        </View>
      )}

      {/* Feedback Display */}
      {lastFeedback && (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackText}>{lastFeedback}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {runState === 'waiting' && (
          <Pressable
            style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
            onPress={handleStartRun}
          >
            <FontAwesome name="play" size={20} color={COLORS.background} />
            <Text style={styles.startButtonText}>START RUN</Text>
          </Pressable>
        )}

        {runState === 'running' && (
          <Pressable
            style={({ pressed }) => [styles.stopButton, pressed && styles.stopButtonPressed]}
            onPress={handleStopRun}
          >
            <FontAwesome name="stop" size={18} color="#FFF" />
            <Text style={styles.stopButtonText}>STOP</Text>
          </Pressable>
        )}

        {runState === 'finished' && (
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            onPress={handleGoBack}
          >
            <Text style={styles.backButtonText}>DONE</Text>
            <FontAwesome name="check" size={18} color={COLORS.background} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    gap: 8,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsDot_searching: {
    backgroundColor: COLORS.warning,
  },
  gpsDot_acquired: {
    backgroundColor: COLORS.success,
  },
  gpsDot_poor: {
    backgroundColor: COLORS.danger,
  },
  gps_searching: {},
  gps_acquired: {},
  gps_poor: {},
  gpsText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  targetBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  targetBadgeText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  mainMetric: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainMetricValue: {
    fontSize: 96,
    fontWeight: '200',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -4,
  },
  mainMetricUnit: {
    fontSize: 16,
    color: COLORS.textSecondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: -8,
  },
  progressSection: {
    marginBottom: 28,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  progressPercent: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  progressTarget: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 8,
  },
  statCardAccent: {
    borderColor: COLORS.cardBorder,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
  },
  paceStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    marginBottom: 16,
  },
  paceStatus_ahead: {
    borderWidth: 1,
    borderColor: COLORS.ahead,
  },
  paceStatus_behind: {
    borderWidth: 1,
    borderColor: COLORS.behind,
  },
  paceStatus_onPace: {
    borderWidth: 1,
    borderColor: COLORS.onPace,
  },
  paceStatusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  feedbackCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  feedbackText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  startButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  startButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  stopButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stopButtonPressed: {
    opacity: 0.9,
  },
  stopButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  backButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  backButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
