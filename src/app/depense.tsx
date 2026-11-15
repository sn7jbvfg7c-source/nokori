import { useLocalSearchParams, useRouter } from 'expo-router';
import { AddExpenseScreen } from '../screens/AddExpenseScreen';
import { useAppState } from '../state/AppState';

/** Nouvelle dépense, ou modification avec /depense?id=… */
export default function Depense() {
  const { addExpense, updateExpense, expenses } = useAppState();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const initial = id ? expenses.find(e => e.id === id) : undefined;
  const router = useRouter();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <AddExpenseScreen today={new Date()} initial={initial} onClose={close}
      onSave={async e => { await (initial ? updateExpense(e) : addExpense(e)); close(); }} />
  );
}
