import { GoalsScreen } from '../../screens/GoalsScreen';
import { useAppState } from '../../state/AppState';
import { useToday } from '../../ui/useToday';
import { TabScene } from '../../ui/TabScene';

export default function Objectifs() {
  const today = useToday();
  const { goals, profile, expenses, saveGoal, removeGoal } = useAppState();
  if (!profile) return null;
  return <TabScene><GoalsScreen goals={goals} profile={profile} expenses={expenses} today={today} onSave={saveGoal} onRemove={removeGoal} /></TabScene>;
}
