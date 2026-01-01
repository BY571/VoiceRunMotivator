import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { RunSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from '../types/location';

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<RunSettings>(DEFAULT_SETTINGS);
  const [feedbackTimeInterval, setFeedbackTimeInterval] = useState('');
  const [feedbackDistanceInterval, setFeedbackDistanceInterval] = useState('');
  const [checkpointInterval, setCheckpointInterval] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const loaded: RunSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        setSettings(loaded);
        setFeedbackTimeInterval(loaded.feedbackTimeInterval.toString());
        setFeedbackDistanceInterval(loaded.feedbackDistanceInterval.toString());
        setCheckpointInterval(loaded.checkpointInterval.toString());
      } else {
        setFeedbackTimeInterval(DEFAULT_SETTINGS.feedbackTimeInterval.toString());
        setFeedbackDistanceInterval(DEFAULT_SETTINGS.feedbackDistanceInterval.toString());
        setCheckpointInterval(DEFAULT_SETTINGS.checkpointInterval.toString());
      }
    } catch {
      Alert.alert('Error', 'Failed to load settings');
    }
  };

  const saveSettings = async () => {
    const timeIntervalNum = parseFloat(feedbackTimeInterval);
    const distanceIntervalNum = parseFloat(feedbackDistanceInterval);
    const checkpointNum = parseFloat(checkpointInterval);

    // Validate
    if (isNaN(timeIntervalNum) || timeIntervalNum < 5) {
      Alert.alert('Error', 'Time interval must be at least 5 seconds');
      return;
    }

    if (isNaN(distanceIntervalNum) || distanceIntervalNum < 0.1) {
      Alert.alert('Error', 'Distance interval must be at least 0.1 km');
      return;
    }

    if (isNaN(checkpointNum) || checkpointNum < 0.1) {
      Alert.alert('Error', 'Checkpoint interval must be at least 0.1 km');
      return;
    }

    const newSettings: RunSettings = {
      ...settings,
      feedbackTimeInterval: timeIntervalNum,
      feedbackDistanceInterval: distanceIntervalNum,
      checkpointInterval: checkpointNum,
    };

    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      Alert.alert('Saved', 'Settings saved successfully');
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const setFeedbackMode = (mode: 'time' | 'distance') => {
    setSettings((prev) => ({ ...prev, feedbackTriggerMode: mode }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* Feedback Trigger Mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pace Feedback Trigger</Text>
        <Text style={styles.description}>
          Choose when you want to receive pace updates during your run.
        </Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              settings.feedbackTriggerMode === 'time' && styles.toggleSelected,
            ]}
            onPress={() => setFeedbackMode('time')}
          >
            <Text
              style={[
                styles.toggleText,
                settings.feedbackTriggerMode === 'time' && styles.toggleTextSelected,
              ]}
            >
              Time-based
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              settings.feedbackTriggerMode === 'distance' && styles.toggleSelected,
            ]}
            onPress={() => setFeedbackMode('distance')}
          >
            <Text
              style={[
                styles.toggleText,
                settings.feedbackTriggerMode === 'distance' && styles.toggleTextSelected,
              ]}
            >
              Distance-based
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time-based settings */}
      {settings.feedbackTriggerMode === 'time' && (
        <View style={styles.section}>
          <Text style={styles.label}>Feedback every (seconds)</Text>
          <Text style={styles.description}>
            How often you'll hear pace updates. Example: 30 = every 30 seconds.
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={feedbackTimeInterval}
            onChangeText={setFeedbackTimeInterval}
            placeholder="30"
          />
        </View>
      )}

      {/* Distance-based settings */}
      {settings.feedbackTriggerMode === 'distance' && (
        <View style={styles.section}>
          <Text style={styles.label}>Feedback every (km)</Text>
          <Text style={styles.description}>
            How often you'll hear pace updates. Example: 0.5 = every 500 meters.
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={feedbackDistanceInterval}
            onChangeText={setFeedbackDistanceInterval}
            placeholder="0.5"
          />
        </View>
      )}

      {/* Checkpoint interval */}
      <View style={styles.section}>
        <Text style={styles.label}>Distance Checkpoints (km)</Text>
        <Text style={styles.description}>
          Announces your elapsed time at each distance milestone. Example: 1.0 = every kilometer.
        </Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={checkpointInterval}
          onChangeText={setCheckpointInterval}
          placeholder="1.0"
        />
      </View>

      {/* Save Button */}
      <Pressable style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </Pressable>

      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  input: {
    height: 50,
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: '#2a2a4e',
    color: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleSelected: {
    backgroundColor: '#2196F3',
  },
  toggleText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  toggleTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
