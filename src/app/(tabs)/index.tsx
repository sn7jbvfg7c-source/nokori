import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { BudgetScreen } from '../../screens/BudgetScreen';
import { useAppState } from '../../state/AppState';
import { useToday } from '../../ui/useToday';
import { TabScene } from '../../ui/TabScene';
import { CrashProbe } from '../../ui/CrashProbe';

export default function Home() {
  const today = useToday();
  const { profile, history, expenses, lastAdded, removeExpense, clearLastAdded } = useAppState();
  const router = useRouter();
  // numéro de chaque demande : toucher deux fois le même pilier réapplique le filtre
  const taps = useRef(0);
  if (!profile) return null; // le garde de la barre d'onglets redirige déjà vers l'accueil
  return (
    <TabScene>
      <CrashProbe where="budget" />
      <BudgetScreen
        profile={profile} history={history} expenses={expenses} today={today}
        onEdit={() => router.push('/accueil')} onAdd={() => router.push('/depense')} onSettings={() => router.push('/reglages')}
        onPillar={p => router.navigate({ pathname: '/activite', params: { pilier: p, t: String(++taps.current) } })}
        lastAdded={lastAdded} onUndo={id => removeExpense(id, false)} onDismiss={clearLastAdded}
      />
    </TabScene>
  );
}

/** Plantage pendant l'affichage : écran d'erreur au lieu d'un écran blanc (aucune donnée lue ni écrite) */
export { TabCrash as ErrorBoundary } from '../../ui/CrashScreen';
