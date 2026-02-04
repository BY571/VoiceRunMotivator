import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from 'react-native';
import { useRouter, Link, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RunSettings, DEFAULT_SETTINGS, SETTINGS_KEY, DistanceUnit } from '../../types/location';
import { convertDistanceToKm, getUnitLabel } from '../../utils/unitConversion';

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
  danger: '#FF4757',
};

export default function GoalSetupScreen() {
  const router = useRouter();
  const [distance, setDistance] = useState('');
  const [time, setTime] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const saved = await AsyncStorage.getItem(SETTINGS_KEY);
          if (saved) {
            const settings: RunSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            setDistanceUnit(settings.distanceUnit);
          }
        } catch {
          // Use defaults
        }
      })();
    }, [])
  );

  const targetPace = useMemo(() => {
    const distVal = parseFloat(distance);
    const timeVal = parseFloat(time);

    if (isNaN(distVal) || isNaN(timeVal) || distVal <= 0 || timeVal <= 0) {
      return null;
    }

    // Pace is always displayed in the user's chosen unit
    const paceMinPerUnit = timeVal / distVal;
    const paceMinutes = Math.floor(paceMinPerUnit);
    const paceSeconds = Math.round((paceMinPerUnit - paceMinutes) * 60);

    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;
  }, [distance, time]);

  const unitLabel = getUnitLabel(distanceUnit);

  const startRun = () => {
    const distanceVal = parseFloat(distance);
    const timeVal = parseFloat(time);

    if (isNaN(distanceVal) || isNaN(timeVal)) {
      Alert.alert('Invalid input', 'Please enter valid numbers for distance and time.');
      return;
    }

    if (distanceVal <= 0 || timeVal <= 0) {
      Alert.alert('Invalid input', 'Distance and time must be greater than 0.');
      return;
    }

    // Convert to km for internal use
    const distanceKm = convertDistanceToKm(distanceVal, distanceUnit);

    router.push({
      pathname: '/run-screen',
      params: {
        targetDistance: distanceKm,
        targetTime: timeVal,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>P</Text>
        </View>
        <Link href="/settings" asChild>
          <Pressable style={styles.settingsButton}>
            <FontAwesome name="cog" size={22} color={COLORS.textSecondary} />
          </Pressable>
        </Link>
      </View>

      <Text style={styles.title}>PACEMAKER</Text>
      <Text style={styles.subtitle}>Enter distance and time to set your pace</Text>

      {/* Target Pace Card */}
      <View style={styles.paceCard}>
        <Text style={styles.paceLabel}>TARGET PACE</Text>
        <View style={styles.paceValueRow}>
          <Text style={[styles.paceValue, !targetPace && styles.paceValueDim]}>
            {targetPace || '--:--'}
          </Text>
          <Text style={styles.paceUnit}>/{unitLabel}</Text>
        </View>
        <View style={styles.paceIndicator}>
          <View style={[styles.paceIndicatorBar, targetPace && styles.paceIndicatorActive]} />
        </View>
      </View>

      {/* Input Cards */}
      <View style={styles.inputRow}>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>DISTANCE</Text>
          <View style={styles.inputInner}>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={distance}
              onChangeText={setDistance}
              placeholder=""
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.inputUnit}>{unitLabel}</Text>
          </View>
          <Text style={styles.inputHint}>e.g. 5</Text>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>TIME</Text>
          <View style={styles.inputInner}>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={time}
              onChangeText={setTime}
              placeholder=""
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.inputUnit}>min</Text>
          </View>
          <Text style={styles.inputHint}>e.g. 25</Text>
        </View>
      </View>

      {/* Start Button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            !targetPace && styles.startButtonDisabled,
            pressed && targetPace && styles.startButtonPressed,
          ]}
          onPress={startRun}
          disabled={!targetPace}
        >
          <Text style={[styles.startButtonText, !targetPace && styles.startButtonTextDisabled]}>
            START RUN
          </Text>
          {targetPace && (
            <FontAwesome name="arrow-right" size={18} color={COLORS.background} style={styles.startButtonIcon} />
          )}
        </Pressable>
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
    marginBottom: 32,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.background,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
    letterSpacing: 1,
  },
  paceCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  paceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 12,
  },
  paceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  paceValue: {
    fontSize: 64,
    fontWeight: '700',
    color: COLORS.accent,
    fontVariant: ['tabular-nums'],
  },
  paceValueDim: {
    color: COLORS.textMuted,
  },
  paceUnit: {
    fontSize: 20,
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  paceIndicator: {
    marginTop: 20,
    height: 4,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  paceIndicatorBar: {
    width: '0%',
    height: '100%',
    backgroundColor: COLORS.textMuted,
    borderRadius: 2,
  },
  paceIndicatorActive: {
    width: '100%',
    backgroundColor: COLORS.accent,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  inputCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  inputLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  inputUnit: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
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
  },
  startButtonPressed: {
    backgroundColor: COLORS.accentDim,
    transform: [{ scale: 0.98 }],
  },
  startButtonDisabled: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  startButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  startButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  startButtonIcon: {
    marginLeft: 12,
  },
});
