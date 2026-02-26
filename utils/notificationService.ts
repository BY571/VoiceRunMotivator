import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'pace-updates';

/**
 * Initialize notifications: set up Android channel, request permissions,
 * and configure how notifications appear when the app is foregrounded.
 */
export async function initializeNotifications(): Promise<boolean> {
  // Configure how notifications behave when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false, // Don't show when foregrounded — speech handles it
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  // Create Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Pace Updates',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 200],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Send a local notification with pace feedback.
 * Used by the background task when the app is not in the foreground.
 */
export async function sendPaceNotification(message: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Pacemaker',
      body: message,
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
    },
    trigger: null, // Fire immediately
  });
}
