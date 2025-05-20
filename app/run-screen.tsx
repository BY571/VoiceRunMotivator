import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { paceFeedbackPhrases, PaceFeedbackType, PaceMakerMode } from '../constants/paceFeedbackPhrases';

const SETTINGS_KEY = 'runSettings';

export default function RunScreen() {
  const params = useLocalSearchParams();
  const targetDistance = params.targetDistance as string;
  const targetTime = params.targetTime as string;

  useEffect(() => {
    if (!targetDistance || !targetTime) {
      Alert.alert('Error', 'Missing required parameters: target distance and time');
      return;
    }

    const targetDistNum = parseFloat(targetDistance);
    const targetTimeNum = parseFloat(targetTime);

    if (isNaN(targetDistNum) || isNaN(targetTimeNum) || targetDistNum <= 0 || targetTimeNum <= 0) {
      Alert.alert('Error', 'Invalid target distance or time values');
      return;
    }
  }, [targetDistance, targetTime]);

  const targetDistNum = parseFloat(targetDistance);
  const targetTimeNum = parseFloat(targetTime);

  const DEFAULT_POLLING_INTERVAL = 5; // seconds
  const DEFAULT_FEEDBACK_INTERVAL = 0.5; // km
  const DEFAULT_TIMING_CHECKPOINT = 0.4; // km

  const [settingsReady, setSettingsReady] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<number>(DEFAULT_POLLING_INTERVAL);
  const [feedbackInterval, setFeedbackInterval] = useState<number>(DEFAULT_FEEDBACK_INTERVAL);
  const [timingCheckpoint, setTimingCheckpoint] = useState<number>(DEFAULT_TIMING_CHECKPOINT);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [feedback, setFeedback] = useState("Let's get started!");
  const [checkpointFeedback, setCheckpointFeedback] = useState("");

  const [pacemakerMode, setPacemakerMode] = useState<PaceMakerMode>('Neutral');
  const lastFeedbackDistanceRef = useRef(0);
  const lastCheckpointDistanceRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const targetPace = targetDistNum / (targetTimeNum * 60); // km per second
  const currentPace = currentDistance / (elapsedSeconds || 1);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_KEY);
        if (saved) {
          const settings = JSON.parse(saved);
          setPollingInterval(settings.pollingInterval ?? DEFAULT_POLLING_INTERVAL);
          setFeedbackInterval(settings.feedbackInterval ?? DEFAULT_FEEDBACK_INTERVAL);
          setTimingCheckpoint(settings.timingCheckpoint ?? DEFAULT_TIMING_CHECKPOINT);
          setPacemakerMode(settings.pacemakerMode ?? 'Neutral');
        }
        setSettingsReady(true);
      } catch (error) {
        Alert.alert('Error', 'Failed to load settings');
      }
    })();
  }, []);

  useEffect(() => {
    if (!settingsReady) return;

    if (pollingInterval <= 0) {
      Alert.alert('Error', 'Invalid polling interval');
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + pollingInterval);
      setCurrentDistance(prevDist => {
        const randomFactor = 0.8 + Math.random() * 0.4;
        const newDist = prevDist + randomFactor * targetPace * pollingInterval;
        return Math.min(newDist, targetDistNum);
      });
    }, pollingInterval * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [settingsReady, pollingInterval, targetPace, targetDistNum]);

  useEffect(() => {
    let paceType: PaceFeedbackType;
    const paceDiff = Math.abs(currentPace - targetPace);

    if (paceDiff < 0.0005) {
      paceType = 'onPace';
    } else if (currentPace < targetPace) {
      paceType = 'behind';
    } else {
      paceType = 'ahead';
    }

    const paceMessage = getRandomFeedback(pacemakerMode, paceType);
    setFeedback(paceMessage);

    if (currentDistance - lastFeedbackDistanceRef.current >= feedbackInterval) {
      lastFeedbackDistanceRef.current = currentDistance;
      Alert.alert('Run Feedback', paceMessage);
    }

    const nextCheckpoint = Math.floor(currentDistance / timingCheckpoint) * timingCheckpoint;
    if (nextCheckpoint > lastCheckpointDistanceRef.current) {
      lastCheckpointDistanceRef.current = nextCheckpoint;

      const expectedTimeForCheckpoint = (nextCheckpoint / targetPace) / 60;
      const actualTimeForCheckpoint = elapsedSeconds / 60;
      const timeDifference = actualTimeForCheckpoint - expectedTimeForCheckpoint;

      let checkpointMessage = '';
      if (Math.abs(timeDifference) < 0.5) {
        checkpointMessage = `${nextCheckpoint.toFixed(1)}km - Perfect timing! Keep this pace!`;
      } else if (timeDifference > 0) {
        checkpointMessage = `${nextCheckpoint.toFixed(1)}km - Speed up! ${timeDifference.toFixed(1)} minutes behind.`;
      } else {
        checkpointMessage = `${nextCheckpoint.toFixed(1)}km - Great pace! ${Math.abs(timeDifference).toFixed(1)} minutes ahead!`;
      }

      setCheckpointFeedback(checkpointMessage);
      Alert.alert('Checkpoint', checkpointMessage);
    }
  }, [currentDistance, elapsedSeconds, feedbackInterval, timingCheckpoint, targetPace, pacemakerMode]);

  function getRandomFeedback(mode: PaceMakerMode, type: PaceFeedbackType): string {
    const messages = paceFeedbackPhrases[mode][type];
    const index = Math.floor(Math.random() * messages.length);
    return messages[index];
  }

  if (!settingsReady) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Target Distance: {targetDistNum} km</Text>
      <Text style={styles.label}>Target Time: {targetTimeNum} min</Text>

      <View style={styles.stats}>
        <Text>Elapsed Time: {(elapsedSeconds / 60).toFixed(2)} min</Text>
        <Text>Distance Covered: {currentDistance.toFixed(2)} km</Text>
        <Text>Current Pace: {(currentPace * 60).toFixed(2)} km/h</Text>
      </View>

      <Text style={styles.feedback}>{feedback}</Text>
      {checkpointFeedback && <Text style={styles.checkpointFeedback}>{checkpointFeedback}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 18,
    marginBottom: 12,
  },
  stats: {
    marginVertical: 20,
  },
  feedback: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e90ff',
    marginTop: 20,
  },
  checkpointFeedback: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 12,
    textAlign: 'center',
  },
});
