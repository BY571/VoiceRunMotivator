import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'runSettings';

export default function RunScreen() {
  const params = useLocalSearchParams();
  const targetDistance = params.targetDistance as string;
  const targetTime = params.targetTime as string;

  const targetDistNum = parseFloat(targetDistance);
  const targetTimeNum = parseFloat(targetTime);

  // Default values in case settings not set yet
  const DEFAULT_POLLING_INTERVAL = 5; // seconds
  const DEFAULT_FEEDBACK_INTERVAL = 0.5; // km

  const [pollingInterval, setPollingInterval] = useState<number>(DEFAULT_POLLING_INTERVAL);
  const [feedbackInterval, setFeedbackInterval] = useState<number>(DEFAULT_FEEDBACK_INTERVAL);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentDistance, setCurrentDistance] = useState(0);

  const lastFeedbackDistanceRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const targetPace = targetDistNum / (targetTimeNum * 60); // km per second
  const currentPace = currentDistance / (elapsedSeconds || 1);
  
  // Generate feedback based on pace
  const feedback = currentPace >= targetPace
    ? "Great! You're on pace!"
    : "Push a bit faster!";

  // Load settings on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_KEY);
        if (saved) {
          const settings = JSON.parse(saved);
          setPollingInterval(settings.pollingInterval ?? DEFAULT_POLLING_INTERVAL);
          setFeedbackInterval(settings.feedbackInterval ?? DEFAULT_FEEDBACK_INTERVAL);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load settings');
      }
    })();
  }, []);

  useEffect(() => {
    // Setup interval based on pollingInterval setting
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + pollingInterval);

      setCurrentDistance(prevDist => {
        // TODO: Replace this simulation with real Strava data fetching
        const randomFactor = 0.8 + Math.random() * 0.4; // simulate variability
        const newDist = prevDist + randomFactor * targetPace * pollingInterval;
        return Math.min(newDist, targetDistNum);
      });
    }, pollingInterval * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollingInterval, targetDistNum, targetPace]);

  // Trigger feedback every time currentDistance passes next feedbackInterval multiple
  useEffect(() => {
    if (currentDistance - lastFeedbackDistanceRef.current >= feedbackInterval) {
      lastFeedbackDistanceRef.current = currentDistance;

      // TODO: Replace alert with your voice feedback playback
      Alert.alert('Run Feedback', feedback);
    }
  }, [currentDistance, feedback, feedbackInterval]);

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
});
