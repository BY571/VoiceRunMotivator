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
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { RunSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from '../types/location';

const COLORS = {
  background: '#0D0D0D',
  cardBg: '#1A1A1A',
  cardBorder: '#2A2A2A',
  accent: '#00D4AA',
  accentDim: '#00A888',
  text: '#FFFFFF',
  textSecondary: '#8A8A8A',
  textMuted: '#4A4A4A',
  inputBg: '#141414',
};

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
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backIconButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>SETTINGS</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Feedback Trigger Mode */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <FontAwesome name="volume-up" size={16} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>FEEDBACK TRIGGER</Text>
        </View>
        <Text style={styles.description}>
          Choose when to receive pace updates during your run.
        </Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              settings.feedbackTriggerMode === 'time' && styles.toggleSelected,
            ]}
            onPress={() => setFeedbackMode('time')}
            activeOpacity={0.7}
          >
            <FontAwesome
              name="clock-o"
              size={16}
              color={settings.feedbackTriggerMode === 'time' ? COLORS.background : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                settings.feedbackTriggerMode === 'time' && styles.toggleTextSelected,
              ]}
            >
              Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              settings.feedbackTriggerMode === 'distance' && styles.toggleSelected,
            ]}
            onPress={() => setFeedbackMode('distance')}
            activeOpacity={0.7}
          >
            <FontAwesome
              name="road"
              size={16}
              color={settings.feedbackTriggerMode === 'distance' ? COLORS.background : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                settings.feedbackTriggerMode === 'distance' && styles.toggleTextSelected,
              ]}
            >
              Distance
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Interval Setting Card */}
      <View style={styles.card}>
        {settings.feedbackTriggerMode === 'time' ? (
          <>
            <Text style={styles.cardLabel}>FEEDBACK INTERVAL</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={feedbackTimeInterval}
                onChangeText={setFeedbackTimeInterval}
                placeholder="30"
                placeholderTextColor={COLORS.textMuted}
              />
              <Text style={styles.inputUnit}>seconds</Text>
            </View>
            <Text style={styles.cardHint}>e.g., 30 = hear updates every 30 seconds</Text>
          </>
        ) : (
          <>
            <Text style={styles.cardLabel}>FEEDBACK INTERVAL</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={feedbackDistanceInterval}
                onChangeText={setFeedbackDistanceInterval}
                placeholder="0.5"
                placeholderTextColor={COLORS.textMuted}
              />
              <Text style={styles.inputUnit}>km</Text>
            </View>
            <Text style={styles.cardHint}>e.g., 0.5 = hear updates every 500 meters</Text>
          </>
        )}
      </View>

      {/* Checkpoint Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome name="flag-checkered" size={14} color={COLORS.accent} />
          <Text style={styles.cardLabel}>DISTANCE CHECKPOINTS</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={checkpointInterval}
            onChangeText={setCheckpointInterval}
            placeholder="1.0"
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.inputUnit}>km</Text>
        </View>
        <Text style={styles.cardHint}>Announces elapsed time at each milestone</Text>
      </View>

      {/* Save Button */}
      <Pressable
        style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
        onPress={saveSettings}
      >
        <FontAwesome name="check" size={18} color={COLORS.background} />
        <Text style={styles.saveButtonText}>SAVE SETTINGS</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 3,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
  },
  toggleSelected: {
    backgroundColor: COLORS.accent,
  },
  toggleText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  toggleTextSelected: {
    color: COLORS.background,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  cardHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 18,
    fontSize: 24,
    fontWeight: '700',
    backgroundColor: COLORS.inputBg,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  inputUnit: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
    minWidth: 70,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  saveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
