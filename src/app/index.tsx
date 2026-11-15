import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BudgetScreen } from '../screens/BudgetScreen';
import { useAppState } from '../state/AppState';
import { colors, font } from '../theme/tokens';

export default function Home() {
  const { ready, profile, expenses, error, lastAdded, removeExpense, clearLastAdded } = useAppState();
  const router = useRouter();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  if (error && !profile) return (
    <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center', padding: 32 }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 18, color: colors.ink }}>{error}</Text>
    </View>
  );
  if (!profile) return <Redirect href="/accueil" />;
  return <BudgetScreen profile={profile} expenses={expenses} today={new Date()} onEdit={() => router.push('/accueil')} onAdd={() => router.push('/depense')}
    lastAdded={lastAdded} onUndo={id => removeExpense(id)} onDismiss={clearLastAdded} />;
}
