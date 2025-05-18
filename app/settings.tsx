import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'runSettings';
const DEFAULT_POLLING_INTERVAL = 10; // seconds
const DEFAULT_FEEDBACK_INTERVAL = 0.4; // km

export default function SettingsScreen() {
  const [pollingInterval, setPollingInterval] = useState('');
  const [feedbackInterval, setFeedbackInterval] = useState('');
  const [currentSettings, setCurrentSettings] = useState<{ pollingInterval?: number; feedbackInterval?: number }>({});

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        setCurrentSettings(settings);
        setPollingInterval(settings.pollingInterval?.toString() || DEFAULT_POLLING_INTERVAL.toString());
        setFeedbackInterval(settings.feedbackInterval?.toString() || DEFAULT_FEEDBACK_INTERVAL.toString());
      } else {
        // Set default values if no settings exist
        const defaultSettings = {
          pollingInterval: DEFAULT_POLLING_INTERVAL,
          feedbackInterval: DEFAULT_FEEDBACK_INTERVAL
        };
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
        setCurrentSettings(defaultSettings);
        setPollingInterval(DEFAULT_POLLING_INTERVAL.toString());
        setFeedbackInterval(DEFAULT_FEEDBACK_INTERVAL.toString());
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load settings');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async () => {
    const polling = parseFloat(pollingInterval);
    const feedback = parseFloat(feedbackInterval);
    if (isNaN(polling) || isNaN(feedback)) {
      Alert.alert('Invalid input', 'Please enter valid numbers');
      return;
    }
    try {
      const newSettings = { pollingInterval: polling, feedbackInterval: feedback };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setCurrentSettings(newSettings);
      Alert.alert('Success', 'Settings saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Polling Interval (seconds):</Text>
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
});
