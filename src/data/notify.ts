/**
 * Programmation des rappels, version web : les notifications locales n'existent pas dans le navigateur.
 * Sur iPhone et Android, c'est notify.native.ts qui est utilisé.
 */
import type { Reminder } from '../domain/reminders';

export const notificationsSupported = false;
export async function askPermission(): Promise<boolean> { return false; }
export async function scheduleReminders(_list: Reminder[]): Promise<number> { return 0; }
export async function cancelReminders(): Promise<void> {}
