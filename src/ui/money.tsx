/**
 * Affichage des montants, partout dans l'app, selon le réglage « Masquer les montants ».
 * Un seul endroit décide : aucun écran ne peut oublier de masquer.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { formatEuros, formatEurosRound, type Cents } from '../domain/money';

export const HIDDEN = '••• €';

interface Money {
  hidden: boolean;
  /** 1 234,56 € */
  eur(c: Cents): string;
  /** 1 235 € */
  round(c: Cents): string;
  /** −12,50 € ou +12,50 € */
  signed(c: Cents, sign: '+' | '−'): string;
  /** libellé lu par le lecteur d'écran */
  spoken(c: Cents): string;
}

const make = (hidden: boolean): Money => ({
  hidden,
  eur: c => (hidden ? HIDDEN : formatEuros(c)),
  round: c => (hidden ? HIDDEN : formatEurosRound(c)),
  signed: (c, sign) => (hidden ? HIDDEN : `${sign}${formatEuros(Math.abs(c))}`),
  spoken: c => (hidden ? 'montant masqué' : formatEuros(c)),
});

const Ctx = createContext<Money>(make(false));

export function MoneyProvider({ hidden, children }: { hidden: boolean; children: ReactNode }) {
  const value = useMemo(() => make(hidden), [hidden]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMoney = () => useContext(Ctx);
