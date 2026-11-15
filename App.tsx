import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, useFonts } from '@expo-google-fonts/geist';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Expense, Profile } from './src/domain/types';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { colors } from './src/theme/tokens';

// Profil d'exemple, le temps de brancher l'accueil (étape 2) et le stockage chiffré
const DEMO_PROFILE: Profile = {
  income: 248000, extraIncome: 12000, payday: 1, savePct: 0.2,
  charges: [
    { id: 'transports', name: 'Pass transports', group: 'transports', amount: 8800, day: 2, freq: 'mois' },
    { id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' },
    { id: 'habitation', name: 'Assurance habitation', group: 'assurance', amount: 3800, day: 8, freq: 'mois' },
    { id: 'netflix', name: 'Netflix', group: 'abos', amount: 1499, day: 10, freq: 'mois' },
    { id: 'basicfit', name: 'Basic-Fit', group: 'sport', amount: 2999, day: 12, freq: '4sem', anchor: '2026-11-12' },
    { id: 'spotify', name: 'Spotify', group: 'abos', amount: 1214, day: 16, freq: 'mois' },
    { id: 'edf', name: 'EDF', group: 'energie', amount: 6400, day: 18, freq: 'mois' },
    { id: 'free', name: 'Free', group: 'internet', amount: 4200, day: 21, freq: 'mois' },
  ],
};
const DEMO_EXPENSES: Expense[] = [
  { id: '1', date: '2026-11-03', label: 'Carrefour City', categoryId: 'courses', amount: 4455 },
  { id: '2', date: '2026-11-07', label: 'Restaurant', categoryId: 'restos', amount: 3800 },
  { id: '3', date: '2026-11-13', label: 'Pathé, 2 places', categoryId: 'culture', amount: 2200 },
  { id: '4', date: '2026-11-14', label: 'Primeur du marché', categoryId: 'courses', amount: 1860 },
];

export default function App() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  return (
    <SafeAreaProvider>
      <BudgetScreen profile={DEMO_PROFILE} expenses={DEMO_EXPENSES} today={new Date(2026, 10, 14)} />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
