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

let chain: Promise<unknown> = Promise.resolve();
/** Une seule programmation à la fois : deux changements rapprochés ne mélangent pas les rappels de deux profils */
const serial = <T,>(f: () => Promise<T>): Promise<T> => { const r = chain.then(f, f); chain = r.catch(() => {}); return r; };

/** Remplace tous les rappels programmés par la liste donnée ; renvoie le nombre programmé */
export function scheduleReminders(list: Reminder[]): Promise<number> { return serial(() => scheduleNow(list)); }

async function scheduleNow(list: Reminder[]): Promise<number> {
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

export function cancelReminders(): Promise<void> { return serial(() => Notifications.cancelAllScheduledNotificationsAsync()); }
