import type { Cents } from './money';
import type { ChargeGroup, FixedCharge, PillarId } from './types';

export const GROUP_PILLAR: Record<ChargeGroup, PillarId> = {
  logement: 'besoins', energie: 'besoins', internet: 'besoins', assurance: 'besoins',
  sante: 'besoins', transports: 'besoins', abos: 'envies', sport: 'envies',
};

export const GROUP_NAME: Record<ChargeGroup, string> = {
  logement: 'Logement', energie: 'Énergie', internet: 'Internet et mobile', assurance: 'Assurances',
  sante: 'Mutuelle santé', transports: 'Transports', abos: 'Abonnements', sport: 'Sport',
};

export const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

const DAY_MS = 86_400_000;
const utc = (y: number, m: number, d: number) => Date.UTC(y, m, d);

/**
 * Jours du mois (year, month 0-11) où tombe la charge.
 * Calculs en UTC : aucun décalage d'heure d'été ne peut faire glisser une échéance d'un jour.
 */
export function chargeDays(c: FixedCharge, year: number, month: number): number[] {
  const n = daysInMonth(year, month);
  if (c.freq === 'mois') return [Math.min(c.day, n)];
  if (c.freq === 'an') return month === (c.month ?? 0) ? [Math.min(c.day, n)] : [];
  // toutes les 4 semaines : on part d'une échéance connue et on avance ou recule de 28 jours
  const [ay, am, ad] = (c.anchor ?? '').split('-').map(Number);
  if (!ay || !am || !ad) return [];
  const start = utc(year, month, 1), end = utc(year, month, n);
  let t = utc(ay, am - 1, ad);
  const step = 28 * DAY_MS;
  if (t > start) t -= Math.ceil((t - start) / step) * step;
  if (t < start) t += Math.ceil((start - t) / step) * step;
  const out: number[] = [];
  for (; t <= end; t += step) out.push(new Date(t).getUTCDate());
  return out;
}

/** Équivalent mensuel d'une charge, en centimes arrondis */
export function monthlyAmount(c: FixedCharge): Cents {
  if (c.freq === '4sem') return Math.round((c.amount * 13) / 12);
  if (c.freq === 'an') return Math.round(c.amount / 12);
  return c.amount;
}

export const pillarOfCharge = (c: FixedCharge): PillarId => GROUP_PILLAR[c.group];
