import { AccountsScreen } from '../../screens/AccountsScreen';
import { useAppState } from '../../state/AppState';
import { useToday } from '../../ui/useToday';
import { TabScene } from '../../ui/TabScene';

export default function Comptes() {
  const today = useToday();
  const { accounts, saveAccount, removeAccount } = useAppState();
  return <TabScene><AccountsScreen accounts={accounts} today={today} onSave={saveAccount} onRemove={removeAccount} /></TabScene>;
}
