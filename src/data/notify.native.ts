/** Rappels locaux sur le téléphone : aucun serveur, aucun jeton de notification envoyé nulle part. */
import * as Notifications from 'expo-notifications';
import type { Reminder } from '../domain/reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export const notificationsSupported = true;

export async function askPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Remplace tous les rappels programmés par la liste donnée ; renvoie le nombre programmé */
export async function scheduleReminders(list: Reminder[]): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await Notifications.getPermissionsAsync()).granted) return 0;
  for (const r of list) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date },
    });
  }
  return list.length;
}

export async function cancelReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
