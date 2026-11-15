import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useColors } from '../theme/theme';
import { Button, EmptyState } from '../ui/kit';
import { AddExpenseScreen } from '../screens/AddExpenseScreen';
import { useAppState } from '../state/AppState';
import { useToday } from '../ui/useToday';

/** Nouvelle dépense, ou modification avec /depense?id=… */
export default function Depense() {
  const today = useToday();
  const { addExpense, updateExpense, expenses, profile } = useAppState();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const initial = id ? expenses.find(e => e.id === id) : undefined;
  const router = useRouter();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  // pas encore de budget : on commence par les questions de départ
  if (!profile) return <Redirect href="/accueil" />;
  // lien vers une dépense qui n'existe plus (supprimée, autre appareil)
  if (id && !initial) return <Missing onClose={close} />;
  return (
    <AddExpenseScreen today={today} initial={initial} onClose={close}
      onSave={async e => {
        await (initial ? updateExpense(e) : addExpense(e));
        // le bouton reste affiché (bloqué) un court instant : un double appui ne retombe pas sur l'écran d'en dessous
        await new Promise(r => setTimeout(r, 180));
        close();
      }} />
  );
}

function Missing({ onClose }: { onClose: () => void }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, justifyContent: 'center', padding: 24 }}>
      <EmptyState icon="search" title="Dépense introuvable" text="Elle a peut-être été supprimée." action={<Button label="Retour" onPress={onClose} />} />
    </View>
  );
}
