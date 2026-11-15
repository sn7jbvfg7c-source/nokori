import { useRouter } from 'expo-router';
import { AddExpenseScreen } from '../screens/AddExpenseScreen';
import { useAppState } from '../state/AppState';

export default function Depense() {
  const { addExpense } = useAppState();
  const router = useRouter();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return <AddExpenseScreen today={new Date()} onClose={close} onSave={async e => { await addExpense(e); close(); }} />;
}
