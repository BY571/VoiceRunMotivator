import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Switch, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from './types/location';

const COLORS = {
  background: '#0D0D0D',
  cardBg: '#1A1A1A',
  cardBorder: '#2A2A2A',
  accent: '#00D4AA',
  text: '#FFFFFF',
  textSecondary: '#8A8A8A',
  textMuted: '#4A4A4A',
};

export default function SettingsScreen() {
  const [feedbackTriggerMode, setFeedbackTriggerMode] = useState<'time' | 'distance'>('time');
  const [feedbackTimeInterval, setFeedbackTimeInterval] = useState('30');
  const [feedbackDistanceInterval, setFeedbackDistanceInterval] = useState('0.5');
  const [checkpointInterval, setCheckpointInterval] = useState('1.0');
  const [autoStopOnGoal, setAutoStopOnGoal] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_KEY);
        if (saved) {
          const settings: RunSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
          setFeedbackTriggerMode(settings.feedbackTriggerMode);
          setFeedbackTimeInterval(settings.feedbackTimeInterval.toString());
          setFeedbackDistanceInterval(settings.feedbackDistanceInterval.toString());
          setCheckpointInterval(settings.checkpointInterval.toString());
          setAutoStopOnGoal(settings.autoStopOnGoal);
        }
      } catch {
        // Use defaults
      }
    }
    loadSettings();
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const settings: RunSettings = {
        feedbackTriggerMode,
        feedbackTimeInterval: parseFloat(feedbackTimeInterval) || DEFAULT_SETTINGS.feedbackTimeInterval,
        feedbackDistanceInterval: parseFloat(feedbackDistanceInterval) || DEFAULT_SETTINGS.feedbackDistanceInterval,
        checkpointInterval: parseFloat(checkpointInterval) || DEFAULT_SETTINGS.checkpointInterval,
        autoStopOnGoal,
      };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore errors
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Run Settings</Text>

      {/* Feedback Trigger Mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feedback Trigger</Text>
        <Text style={styles.sectionDescription}>
          Choose when to receive pace feedback during your run
        </Text>
        <View style={styles.modeToggle}>
          <Pressable
            style={[
              styles.modeButton,
              feedbackTriggerMode === 'time' && styles.modeButtonActive,
            ]}
            onPress={() => setFeedbackTriggerMode('time')}
          >
            <Text
              style={[
                styles.modeButtonText,
                feedbackTriggerMode === 'time' && styles.modeButtonTextActive,
              ]}
            >
              Time-Based
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.modeButton,
              feedbackTriggerMode === 'distance' && styles.modeButtonActive,
            ]}
            onPress={() => setFeedbackTriggerMode('distance')}
          >
            <Text
              style={[
                styles.modeButtonText,
                feedbackTriggerMode === 'distance' && styles.modeButtonTextActive,
              ]}
            >
              Distance-Based
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Time Interval (shown when time mode is selected) */}
      {feedbackTriggerMode === 'time' && (
        <View style={styles.section}>
          <Text style={styles.label}>Feedback Time Interval (seconds)</Text>
          <Text style={styles.hint}>
            How often to provide pace feedback (e.g., every 30 seconds)
          </Text>
          <TextInput
            keyboardType="numeric"
            value={feedbackTimeInterval}
            onChangeText={setFeedbackTimeInterval}
            style={styles.input}
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      )}

      {/* Distance Interval (shown when distance mode is selected) */}
      {feedbackTriggerMode === 'distance' && (
        <View style={styles.section}>
          <Text style={styles.label}>Feedback Distance Interval (km)</Text>
          <Text style={styles.hint}>
            How often to provide pace feedback (e.g., every 0.5 km)
          </Text>
          <TextInput
            keyboardType="numeric"
            value={feedbackDistanceInterval}
            onChangeText={setFeedbackDistanceInterval}
            style={styles.input}
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      )}

      {/* Checkpoint Interval */}
      <View style={styles.section}>
        <Text style={styles.label}>Checkpoint Interval (km)</Text>
        <Text style={styles.hint}>
          Distance milestones to announce (e.g., "1 kilometer" at each km)
        </Text>
        <TextInput
          keyboardType="numeric"
          value={checkpointInterval}
          onChangeText={setCheckpointInterval}
          style={styles.input}
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {/* Auto Stop on Goal */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.label}>Auto-Stop on Goal</Text>
            <Text style={styles.hint}>
              Automatically stop tracking when you reach your distance goal
            </Text>
          </View>
          <Switch
            value={autoStopOnGoal}
            onValueChange={setAutoStopOnGoal}
            trackColor={{ false: COLORS.cardBorder, true: COLORS.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Save Button */}
      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          pressed && styles.saveButtonPressed,
          isSaving && styles.saveButtonDisabled,
        ]}
        onPress={saveSettings}
        disabled={isSaving}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? 'SAVING...' : 'SAVE SETTINGS'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 32,
    letterSpacing: -1,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  modeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeButtonTextActive: {
    color: COLORS.background,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  saveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
