import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CompletedRun, RunSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from '../../types/location';
import { loadRunHistory, deleteRunFromHistory, clearRunHistory } from '../../utils/runStorage';
import { formatElapsedTime } from '../../utils/haversine';
import { convertDistanceForDisplay, formatPaceForUnit, getUnitLabel } from '../../utils/unitConversion';
import ErrorBoundary from '../../components/ErrorBoundary';

const COLORS = {
  background: '#0D0D0D',
  cardBg: '#1A1A1A',
  cardBorder: '#2A2A2A',
  accent: '#00D4AA',
  text: '#FFFFFF',
  textSecondary: '#8A8A8A',
  textMuted: '#4A4A4A',
  danger: '#FF4757',
  success: '#00D4AA',
};

export default function HistoryScreen() {
  const [runs, setRuns] = useState<CompletedRun[]>([]);
  const [distanceUnit, setDistanceUnit] = useState(DEFAULT_SETTINGS.distanceUnit);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const history = await loadRunHistory();
        setRuns(history);

        try {
          const saved = await AsyncStorage.getItem(SETTINGS_KEY);
          if (saved) {
            const settings: RunSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            setDistanceUnit(settings.distanceUnit);
          }
        } catch {
          // Use default
        }
      };
      load();
    }, [])
  );

  const handleDelete = (id: string) => {
    Alert.alert('Delete Run', 'Remove this run from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRunFromHistory(id);
          setRuns((prev) => prev.filter((r) => r.id !== id));
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (runs.length === 0) return;
    Alert.alert('Clear History', 'Delete all run history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await clearRunHistory();
          setRuns([]);
        },
      },
    ]);
  };

  const unit = distanceUnit;
  const unitLabel = getUnitLabel(unit);

  const renderItem = ({ item }: { item: CompletedRun }) => {
    const date = new Date(item.date);
    const dateStr = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const displayDist = convertDistanceForDisplay(item.actualDistance, unit);
    const paceStr = formatPaceForUnit(item.averagePace, unit);

    return (
      <View style={styles.runCard}>
        <View style={styles.runCardHeader}>
          <View>
            <Text style={styles.runDate}>{dateStr}</Text>
            <Text style={styles.runTime}>{timeStr}</Text>
          </View>
          <View style={styles.runCardRight}>
            {item.completedGoal && (
              <View style={styles.goalBadge}>
                <FontAwesome name="check" size={10} color={COLORS.background} />
              </View>
            )}
            <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
              <FontAwesome name="trash-o" size={18} color={COLORS.textMuted} />
            </Pressable>
          </View>
        </View>
        <View style={styles.runStats}>
          <View style={styles.runStat}>
            <Text style={styles.runStatValue}>{displayDist.toFixed(2)}</Text>
            <Text style={styles.runStatLabel}>{unitLabel}</Text>
          </View>
          <View style={styles.runStat}>
            <Text style={styles.runStatValue}>{formatElapsedTime(item.actualTime)}</Text>
            <Text style={styles.runStatLabel}>TIME</Text>
          </View>
          <View style={styles.runStat}>
            <Text style={styles.runStatValue}>{paceStr}</Text>
            <Text style={styles.runStatLabel}>/{unitLabel}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ErrorBoundary fallbackMessage="Could not load run history. Please try again.">
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>HISTORY</Text>
        {runs.length > 0 && (
          <Pressable onPress={handleClearAll} hitSlop={8}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </Pressable>
        )}
      </View>

      {runs.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="road" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No runs yet</Text>
          <Text style={styles.emptySubtitle}>Complete a run and it will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={runs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 3,
  },
  clearAllText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  runCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  runCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  runCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  runDate: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  runTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  goalBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  runStat: {
    alignItems: 'center',
  },
  runStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  runStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
  },
});
