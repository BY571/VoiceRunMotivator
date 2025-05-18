import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'runSettings';

export default function SettingsScreen() {
  const [pollingInterval, setPollingInterval] = useState('10'); // seconds
  const [feedbackInterval, setFeedbackInterval] = useState('0.5'); // km

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        setPollingInterval(settings.pollingInterval.toString());
        setFeedbackInterval(settings.feedbackInterval.toString());
      }
    })();
  }, []);

  const saveSettings = async () => {
    const settings = {
      pollingInterval: parseFloat(pollingInterval),
      feedbackInterval: parseFloat(feedbackInterval),
    };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    alert('Settings saved!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Data Polling Interval (seconds):</Text>
      <TextInput
        keyboardType="numeric"
        value={pollingInterval}
        onChangeText={setPollingInterval}
        style={styles.input}
      />

      <Text style={styles.label}>Feedback Interval (km):</Text>
      <TextInput
        keyboardType="numeric"
        value={feedbackInterval}
        onChangeText={setFeedbackInterval}
        style={styles.input}
      />

      <Button title="Save Settings" onPress={saveSettings} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  label: { fontSize: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    marginBottom: 16,
    padding: 8,
    fontSize: 16,
  },
});
