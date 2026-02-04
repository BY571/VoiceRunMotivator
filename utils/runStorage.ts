import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletedRun, RUN_HISTORY_KEY } from '../types/location';

export function generateRunId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export async function saveCompletedRun(run: CompletedRun): Promise<void> {
  const history = await loadRunHistory();
  history.unshift(run); // newest first
  await AsyncStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(history));
}

export async function loadRunHistory(): Promise<CompletedRun[]> {
  try {
    const stored = await AsyncStorage.getItem(RUN_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function deleteRunFromHistory(id: string): Promise<void> {
  const history = await loadRunHistory();
  const filtered = history.filter((run) => run.id !== id);
  await AsyncStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(filtered));
}

export async function clearRunHistory(): Promise<void> {
  await AsyncStorage.removeItem(RUN_HISTORY_KEY);
}
