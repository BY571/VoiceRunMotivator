import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { Stack, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaceMakerMode, PaceFeedbackType } from '../constants/paceFeedbackPhrases';
import { paceFeedbackPhrases } from '../constants/paceFeedbackPhrases';

const DEFAULT_POLLING_INTERVAL = 1000;
const DEFAULT_FEEDBACK_INTERVAL = 0.5;
const DEFAULT_TIMING_CHECKPOINT = 0.5;
const SETTINGS_KEY = 'runSettings';

export default function RunScreen() {
  const { targetDistance, targetTime } = useLocalSearchParams<{ targetDistance: string, targetTime: string }>();
  const targetDistNum = parseFloat(targetDistance);
  const targetTimeNum = parseFloat(targetTime);
  // Convert target pace from minutes/km to km/hour for easier calculations
  const targetPaceKmPerHour = 60 / (targetTimeNum / targetDistNum);
  // Convert to meters per second
  const targetSpeedMps = targetPaceKmPerHour * 1000 / 3600;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [currentPace, setCurrentPace] = useState(0);
  const [feedback, setFeedback] = useState("Let's get started!");
  const [checkpointFeedback, setCheckpointFeedback] = useState("");
  const [pollingInterval, setPollingInterval] = useState(DEFAULT_POLLING_INTERVAL);
  const [feedbackInterval, setFeedbackInterval] = useState(DEFAULT_FEEDBACK_INTERVAL);
  const [timingCheckpoint, setTimingCheckpoint] = useState(DEFAULT_TIMING_CHECKPOINT);
  const [pacemakerMode, setPacemakerMode] = useState<PaceMakerMode>('Neutral');
  const [settingsReady, setSettingsReady] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const lastFeedbackDistanceRef = useRef<number>(0);
  const lastCheckpointDistanceRef = useRef<number>(0);

  useEffect(() => {
    if (!targetDistance || !targetTime) {
      Alert.alert('Error', 'Missing required parameters: target distance and time');
      return;
    }

    if (isNaN(targetDistNum) || isNaN(targetTimeNum) || targetDistNum <= 0 || targetTimeNum <= 0) {
      Alert.alert('Error', 'Invalid target distance or time values');
      return;
    }
  }, [targetDistance, targetTime]);



  // Initialize speech synthesis
  useEffect(() => {
    const initializeSpeech = async () => {
      try {
        await Speech.getAvailableVoicesAsync();
      } catch (error) {
        console.error('Speech initialization error:', error);
        Alert.alert('Error', 'Failed to initialize speech synthesis');
      }
    };

    initializeSpeech();
  }, []);

  // Load settings
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
    if (!settingsReady || !pollingInterval || targetSpeedMps <= 0 || targetDistNum <= 0) {
      return;
    }

    // Convert polling interval from seconds to milliseconds
    const pollingMs = pollingInterval * 1000;
    
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev: number) => prev + 1);
      setCurrentDistance((prevDist: number) => {
        // Convert meters to kilometers
        const distanceIncrement = targetSpeedMps / 1000;
        const newDist = prevDist + distanceIncrement;
        return Math.min(newDist, targetDistNum);
      });
    }, 1000); // Update every second

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settingsReady, pollingInterval, targetSpeedMps, targetDistNum]);

  useEffect(() => {
    const updateFeedback = async () => {
      let paceType: PaceFeedbackType;
      // Calculate current speed in km/h
      const currentSpeedKmh = (currentDistance / (elapsedSeconds / 3600));
      const targetSpeedKmh = targetPaceKmPerHour;
      const speedDiff = Math.abs(currentSpeedKmh - targetSpeedKmh);

      if (speedDiff < 0.5) { // Allow 0.5 km/h difference
        paceType = 'onPace';
      } else if (currentSpeedKmh < targetSpeedKmh) {
        paceType = 'behind';
      } else {
        paceType = 'ahead';
      }

      // Give feedback every feedbackInterval kilometers
      const nextFeedbackDistance = Math.floor(currentDistance / feedbackInterval) * feedbackInterval;
      if (nextFeedbackDistance > lastFeedbackDistanceRef.current && nextFeedbackDistance > 0) {
        lastFeedbackDistanceRef.current = nextFeedbackDistance;
        
        // Get new feedback message
        const paceMessage = getRandomFeedback(pacemakerMode, paceType);
        
        try {
          await Speech.stop();
          // Only update display when we're about to speak
          setFeedback(paceMessage);
          await Speech.speak(paceMessage, {
            language: 'en-US',
            pitch: 1.2,    // Slightly higher pitch (normal is 1.0)
            rate: 0.9,     // Slightly slower rate (normal is 1.0)
            volume: 1.0    // Maximum volume
          });
        } catch (error) {
          console.error('Speech synthesis error:', error);
        }
      }

      // Check if we've hit a new timing checkpoint
      const nextCheckpoint = Math.floor(currentDistance / timingCheckpoint) * timingCheckpoint;
      if (nextCheckpoint > lastCheckpointDistanceRef.current && nextCheckpoint > 0) {
        lastCheckpointDistanceRef.current = nextCheckpoint;

        // Format elapsed time into minutes and seconds
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = Math.floor(elapsedSeconds % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Announce distance and elapsed time
        const checkpointMessage = `${nextCheckpoint.toFixed(1)} kilometers completed! Time elapsed: ${timeStr}`;
        
        try {
          await Speech.stop();
          // Only update display when we're about to speak
          setCheckpointFeedback(checkpointMessage);
          await Speech.speak(checkpointMessage, {
            language: 'en-US',
            pitch: 1.0,     // Normal pitch for checkpoints
            rate: 0.9,      // Slightly slower for clarity
            volume: 1.0     // Maximum volume
          });
        } catch (error) {
          console.error('Speech synthesis error:', error);
        }
      }
    };

    updateFeedback();
  }, [currentDistance, elapsedSeconds, feedbackInterval, timingCheckpoint, targetPaceKmPerHour, pacemakerMode]);

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
