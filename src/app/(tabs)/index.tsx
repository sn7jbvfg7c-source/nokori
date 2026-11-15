import { useRouter } from 'expo-router';
import { BudgetScreen } from '../../screens/BudgetScreen';
import { useAppState } from '../../state/AppState';

export default function Home() {
  const { profile, history, expenses, lastAdded, removeExpense, clearLastAdded } = useAppState();
  const router = useRouter();
  if (!profile) return null; // le garde de la barre d'onglets redirige déjà vers l'accueil
  return (
    <BudgetScreen
      profile={profile} history={history} expenses={expenses} today={new Date()}
      onEdit={() => router.push('/accueil')} onAdd={() => router.push('/depense')} onSettings={() => router.push('/reglages')}
      lastAdded={lastAdded} onUndo={id => removeExpense(id, false)} onDismiss={clearLastAdded}
    />
  );
}
