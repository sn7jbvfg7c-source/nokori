import type { Cents } from './money';

export type PillarId = 'besoins' | 'envies' | 'culture' | 'imprevus';
export type Frequency = 'mois' | '4sem' | 'an';
export type ChargeGroup = 'logement' | 'energie' | 'internet' | 'assurance' | 'sante' | 'transports' | 'abos' | 'sport';

/** Une charge fixe : loyer, énergie, abonnement… */
export interface FixedCharge {
  id: string;
  name: string;
  group: ChargeGroup;
  amount: Cents;
  /** jour du mois (1 à 31) ; pour « 4 semaines », jour de la prochaine échéance connue */
  day: number;
  freq: Frequency;
  /** « 4 semaines » : date ISO d'une échéance connue (AAAA-MM-JJ) ; « an » : ignorée */
  anchor?: string;
  /** « an » : mois de l'échéance (0 = janvier) */
  month?: number;
}

export interface Profile {
  /** revenu net mensuel principal */
  income: Cents;
  /** autres revenus du mois (vente d'occasion…) */
  extraIncome: Cents;
  /** jour de la paie (1 à 31) */
  payday: number;
  /** part du revenu à épargner, de 0 à 0,4 */
  savePct: number;
  charges: FixedCharge[];
}

/** Une dépense saisie à la main */
export interface Expense {
  id: string;
  /** date ISO AAAA-MM-JJ */
  date: string;
  label: string;
  categoryId: string;
  amount: Cents;
}

export interface Category {
  id: string;
  name: string;
  pillar: PillarId;
  /** budget de référence pour 1 010 € de reste à vivre, mis à l'échelle du vrai reste */
  reference: Cents;
}
