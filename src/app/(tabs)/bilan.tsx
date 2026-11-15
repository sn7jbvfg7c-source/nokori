import { useCallback } from 'react';
import { ReviewScreen } from '../../screens/ReviewScreen';
import { useAppState } from '../../state/AppState';

export default function Bilan() {
  const { profile, profileFor, expenses, notes, saveNote } = useAppState();
  const profileAt = useCallback((y: number, m: number) => profileFor(y, m)!, [profileFor]);
  if (!profile) return null;
  return <ReviewScreen profile={profile} profileAt={profileAt} expenses={expenses} notes={notes} today={new Date()} onSaveNote={saveNote} />;
}
