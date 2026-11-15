import { useRouter } from 'expo-router';
import { ActivityScreen } from '../../screens/ActivityScreen';
import { useAppState } from '../../state/AppState';

export default function Activite() {
  const { profile, expenses, dismissed, removeExpense, dismissSuggestion, acceptSuggestion } = useAppState();
  const router = useRouter();
  if (!profile) return null;
  return (
    <ActivityScreen
      profile={profile} expenses={expenses} dismissed={dismissed} today={new Date()}
      onAdd={() => router.push('/depense')} onDelete={removeExpense}
      onIgnore={dismissSuggestion} onAccept={s => acceptSuggestion(s, new Date())}
    />
  );
}
