import { useCallback } from 'react';
import { ReviewScreen } from '../../screens/ReviewScreen';
import { useAppState } from '../../state/AppState';
import { useToday } from '../../ui/useToday';
import { TabScene } from '../../ui/TabScene';

export default function Bilan() {
  const today = useToday();
  const { profile, profileFor, expenses, notes, saveNote } = useAppState();
  const profileAt = useCallback((y: number, m: number) => profileFor(y, m)!, [profileFor]);
  if (!profile) return null;
  return <TabScene><ReviewScreen profile={profile} profileAt={profileAt} expenses={expenses} notes={notes} today={today} onSaveNote={saveNote} /></TabScene>;
}
