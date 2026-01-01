import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from 'react-native';
import { useRouter, Link } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function GoalSetupScreen() {
  const router = useRouter();
  const [distance, setDistance] = useState('');
  const [time, setTime] = useState('');

  // Calculate target pace when inputs change
  const targetPace = useMemo(() => {
    const distVal = parseFloat(distance);
    const timeVal = parseFloat(time);

    if (isNaN(distVal) || isNaN(timeVal) || distVal <= 0 || timeVal <= 0) {
      return null;
    }

    const paceMinPerKm = timeVal / distVal;
    const paceMinutes = Math.floor(paceMinPerKm);
    const paceSeconds = Math.round((paceMinPerKm - paceMinutes) * 60);

    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;
  }, [distance, time]);

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

    router.push({
      pathname: '/run-screen',
      params: {
        targetDistance: distanceVal,
        targetTime: timeVal,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Settings Button */}
      <Link href="/settings" asChild>
        <Pressable style={styles.settingsButton}>
          <FontAwesome name="gear" size={24} color="#888" />
        </Pressable>
      </Link>

      <Text style={styles.title}>Pacemaker</Text>
      <Text style={styles.subtitle}>Set your running goal</Text>

      {/* Target Pace Display */}
      <View style={styles.paceContainer}>
        <Text style={styles.paceLabel}>Target Pace</Text>
        <Text style={styles.paceValue}>
          {targetPace ? `${targetPace} /km` : '-- /km'}
        </Text>
      </View>

      {/* Input Fields */}
      <View style={styles.inputContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Distance</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={distance}
              onChangeText={setDistance}
              placeholder="5.0"
              placeholderTextColor="#555"
            />
            <Text style={styles.unit}>km</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Time</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={time}
              onChangeText={setTime}
              placeholder="25"
              placeholderTextColor="#555"
            />
            <Text style={styles.unit}>min</Text>
          </View>
        </View>
      </View>

      {/* Start Button */}
      <Pressable
        style={[styles.startButton, !targetPace && styles.startButtonDisabled]}
        onPress={startRun}
        disabled={!targetPace}
      >
        <Text style={styles.startButtonText}>START RUN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#1a1a2e',
    paddingTop: 60,
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    padding: 8,
    zIndex: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  paceContainer: {
    alignItems: 'center',
    marginBottom: 50,
    paddingVertical: 30,
    backgroundColor: '#2a2a4e',
    borderRadius: 16,
  },
  paceLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  paceValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2196F3',
    fontVariant: ['tabular-nums'],
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    paddingRight: 16,
  },
  input: {
    flex: 1,
    height: 60,
    paddingHorizontal: 16,
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  unit: {
    fontSize: 16,
    color: '#888',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#333',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
