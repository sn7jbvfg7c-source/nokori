/**
 * La date du jour, tenue à jour : à minuit, et quand l'app revient au premier plan.
 * Sans cela, une app laissée ouverte la nuit garderait « hier » comme aujourd'hui (jours restants, budget du jour…).
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const dayKey = (d: Date) => d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();

export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setToday(prev => (dayKey(new Date()) === dayKey(prev) ? prev : new Date()));
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1).getTime() - now.getTime();
    const timer = setTimeout(refresh, Math.max(1000, msToMidnight));
    const sub = AppState.addEventListener('change', s => { if (s === 'active') refresh(); });
    const poll = setInterval(refresh, 60_000); // filet de sécurité (mise en veille, changement d'heure)
    return () => { clearTimeout(timer); clearInterval(poll); sub.remove(); };
  }, [today]);
  return today;
}
