import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'runSettings';
const DEFAULT_POLLING_INTERVAL = 10; // seconds
const DEFAULT_FEEDBACK_INTERVAL = 0.4; // km
const DEFAULT_TIMING_CHECKPOINT = 0.4; // km
const DEFAULT_PACEMAKER_MODE = 'Neutral';

type PaceMakerMode = 'Neutral' | 'Motivating' | 'Goggins';

export default function SettingsScreen() {
  const [pollingInterval, setPollingInterval] = useState('');
  const [feedbackInterval, setFeedbackInterval] = useState('');
  const [timingCheckpoint, setTimingCheckpoint] = useState('');
  const [pacemakerMode, setPacemakerMode] = useState<PaceMakerMode>(DEFAULT_PACEMAKER_MODE as PaceMakerMode);
  const [currentSettings, setCurrentSettings] = useState<{
    pollingInterval: number;
    feedbackInterval: number;
    timingCheckpoint: number;
    pacemakerMode: PaceMakerMode;
  }>({ 
    pollingInterval: DEFAULT_POLLING_INTERVAL,
    feedbackInterval: DEFAULT_FEEDBACK_INTERVAL,
    timingCheckpoint: DEFAULT_TIMING_CHECKPOINT,
    pacemakerMode: DEFAULT_PACEMAKER_MODE as PaceMakerMode
  });

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        setCurrentSettings(settings);
        setPollingInterval(settings.pollingInterval?.toString() || DEFAULT_POLLING_INTERVAL.toString());
        setFeedbackInterval(settings.feedbackInterval?.toString() || DEFAULT_FEEDBACK_INTERVAL.toString());
        setTimingCheckpoint(settings.timingCheckpoint?.toString() || DEFAULT_TIMING_CHECKPOINT.toString());
        setPacemakerMode((settings.pacemakerMode as PaceMakerMode) || DEFAULT_PACEMAKER_MODE as PaceMakerMode);
      } else {
        // Set default values if no settings exist
        const defaultSettings: {
          pollingInterval: number;
          feedbackInterval: number;
          timingCheckpoint: number;
          pacemakerMode: PaceMakerMode;
        } = {
          pollingInterval: DEFAULT_POLLING_INTERVAL,
          feedbackInterval: DEFAULT_FEEDBACK_INTERVAL,
          timingCheckpoint: DEFAULT_TIMING_CHECKPOINT,
          pacemakerMode: DEFAULT_PACEMAKER_MODE as PaceMakerMode
        };
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
        setCurrentSettings(defaultSettings);
        setPollingInterval(DEFAULT_POLLING_INTERVAL.toString());
        setFeedbackInterval(DEFAULT_FEEDBACK_INTERVAL.toString());
        setTimingCheckpoint(DEFAULT_TIMING_CHECKPOINT.toString());
        setPacemakerMode(DEFAULT_PACEMAKER_MODE as PaceMakerMode);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load settings');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async () => {
    const pollingNum = parseFloat(pollingInterval);
    const feedbackNum = parseFloat(feedbackInterval);
    const checkpointNum = parseFloat(timingCheckpoint);

    // Validate inputs
    if (isNaN(pollingNum) || pollingNum <= 0) {
      Alert.alert('Error', 'Polling interval must be greater than 0');
      return;
    }

    if (isNaN(feedbackNum) || feedbackNum <= 0) {
      Alert.alert('Error', 'Feedback interval must be greater than 0');
      return;
    }

    if (isNaN(checkpointNum) || checkpointNum < 0.1 || checkpointNum > 1) {
      Alert.alert('Error', 'Timing checkpoint must be between 0.1 km and 1 km');
      return;
    }

    const newSettings: {
      pollingInterval: number;
      feedbackInterval: number;
      timingCheckpoint: number;
      pacemakerMode: PaceMakerMode;
    } = {
      pollingInterval: pollingNum,
      feedbackInterval: feedbackNum,
      timingCheckpoint: checkpointNum,
      pacemakerMode
    };

    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setCurrentSettings(newSettings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Polling Interval (seconds):</Text>
      <Text style={styles.description}>How often data gets updated from Strava.</Text>
      <Text style={styles.currentValue}>
        Current: {currentSettings.pollingInterval?.toString() || 'Not set'}
      </Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={pollingInterval}
        onChangeText={setPollingInterval}
        placeholder="e.g., 10"
      />

      <Text style={styles.label}>Feedback Interval (km):</Text>
      <Text style={styles.description}>How often pacemaker will update you on your current pace status.</Text>
      <Text style={styles.currentValue}>
        Current: {currentSettings.feedbackInterval?.toString() || 'Not set'}
      </Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={feedbackInterval}
        onChangeText={setFeedbackInterval}
        placeholder="e.g., 0.5"
      />

      <Text style={styles.label}>Timing Checkpoint (km):</Text>
      <Text style={styles.description}>At what distance intervals pacemaker will inform you about your current time.</Text>
      <Text style={styles.currentValue}>
        Current: {currentSettings.timingCheckpoint?.toString() || 'Not set'}
      </Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={timingCheckpoint}
        onChangeText={setTimingCheckpoint}
        placeholder="e.g., 0.4"
      />

      <Text style={styles.label}>PaceMaker Mode:</Text>
      <Text style={styles.description}>Select the personality and motivation style of your pacemaker.</Text>
      <Text style={styles.currentValue}>
        Current: {currentSettings.pacemakerMode || 'Not set'}
      </Text>
      <View style={styles.sliderContainer}>
        {(['Neutral', 'Motivating', 'Goggins'] as PaceMakerMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.sliderOption, mode === pacemakerMode && styles.sliderOptionSelected]}
            onPress={() => setPacemakerMode(mode)}
          >
            <Text style={[styles.sliderText, mode === pacemakerMode && styles.sliderTextSelected]}>
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Save Settings" onPress={saveSettings} color="#2196F3" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  label: {
    fontSize: 18,
    marginBottom: 6,
  },
  currentValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  buttonContainer: {
    marginTop: 16,
  },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    padding: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  sliderOption: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  sliderOptionSelected: {
    backgroundColor: '#2196F3',
  },
  sliderText: {
    fontSize: 14,
    color: '#666',
  },
  sliderTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
});
