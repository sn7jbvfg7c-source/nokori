import { GoalsScreen } from '../../screens/GoalsScreen';
import { useAppState } from '../../state/AppState';

export default function Objectifs() {
  const { goals, profile, expenses, saveGoal, removeGoal } = useAppState();
  if (!profile) return null;
  return <GoalsScreen goals={goals} profile={profile} expenses={expenses} today={new Date()} onSave={saveGoal} onRemove={removeGoal} />;
}
