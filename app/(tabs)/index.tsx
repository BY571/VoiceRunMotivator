import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';


export default function GoalSetupScreen() {
  const router = useRouter();
  const [distance, setDistance] = useState('');
  const [time, setTime] = useState('');

  const startRun = () => {
    const distanceVal = parseFloat(distance);
    const timeVal = parseFloat(time);

    if (isNaN(distanceVal) || isNaN(timeVal)) {
      Alert.alert('Invalid input', 'Please enter valid numbers for distance and time.');
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
      <Text style={styles.title}>Set Your Goal</Text>
      <Text style={styles.label}>Target Distance (km):</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={distance}
        onChangeText={setDistance}
        placeholder="e.g., 5.0"
      />

      <Text style={styles.label}>Target Time (minutes):</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={time}
        onChangeText={setTime}
        placeholder="e.g., 25"
      />

      <View style={styles.buttonContainer}>
        <Button title="Start Run" onPress={startRun} color="#2196F3" />
        <Link href="/settings" asChild>
          <Button title="Open Settings" color="#9E9E9E" />
        </Link>
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
    gap: 16,
    marginTop: 16,
  },
});
