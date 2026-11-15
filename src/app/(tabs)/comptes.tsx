import { AccountsScreen } from '../../screens/AccountsScreen';
import { useAppState } from '../../state/AppState';

export default function Comptes() {
  const { accounts, saveAccount, removeAccount, prefs } = useAppState();
  return <AccountsScreen accounts={accounts} today={new Date()} onSave={saveAccount} onRemove={removeAccount} hideAmounts={prefs.hideAmounts} />;
}
