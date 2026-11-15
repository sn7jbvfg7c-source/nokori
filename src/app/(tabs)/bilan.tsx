import { ReviewScreen } from '../../screens/ReviewScreen';
import { useAppState } from '../../state/AppState';

export default function Bilan() {
  const { profile, expenses, notes, saveNote } = useAppState();
  if (!profile) return null;
  return <ReviewScreen profile={profile} expenses={expenses} notes={notes} today={new Date()} onSaveNote={saveNote} />;
}
