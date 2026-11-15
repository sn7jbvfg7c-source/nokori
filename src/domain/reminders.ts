/**
 * Rappels avant prélèvement : calculés ici, programmés en local sur le téléphone (aucun serveur).
 * Le texte ne contient jamais de montant : il peut s'afficher sur l'écran verrouillé.
 */
import { chargeDays } from './charges';
import { MONTH_NAMES } from './months';
import type { Profile } from './types';

export interface Reminder { id: string; date: Date; title: string; body: string }

/** iOS garde au plus 64 notifications programmées par app : on reste en dessous */
export const MAX_REMINDERS = 60;

export function reminders(p: Profile, now: Date, lead = 3, horizonDays = 62): Reminder[] {
  const out: Reminder[] = [];
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + horizonDays);
  for (let k = 0; k <= 3; k++) {
    const y = now.getFullYear(), m = now.getMonth() + k, d0 = new Date(y, m, 1);
    for (const c of p.charges) for (const d of chargeDays(c, d0.getFullYear(), d0.getMonth())) {
      const due = new Date(d0.getFullYear(), d0.getMonth(), d);
      if (due > end) continue;
      const at = new Date(due.getFullYear(), due.getMonth(), due.getDate() - lead, 9, 0, 0);
      if (at <= now) continue;
      out.push({
        id: `${c.id}-${due.getFullYear()}-${due.getMonth() + 1}-${d}`,
        date: at,
        title: lead === 0 ? 'Prélèvement aujourd’hui' : `Prélèvement dans ${lead} jour${lead > 1 ? 's' : ''}`,
        body: `${c.name} sera prélevé le ${d} ${MONTH_NAMES[due.getMonth()]}. Déjà compté dans votre budget.`,
      });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_REMINDERS);
}
