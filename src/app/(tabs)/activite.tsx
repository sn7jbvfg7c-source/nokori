import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityScreen } from '../../screens/ActivityScreen';
import { useAppState } from '../../state/AppState';

export default function Activite() {
  const s = useAppState();
  const router = useRouter();
  const { pilier, t } = useLocalSearchParams<{ pilier?: string; t?: string }>();
  const linkFilter = pilier === 'besoins' || pilier === 'envies' || pilier === 'culture' || pilier === 'imprevus' ? pilier : null;
  const { profileFor } = s;
  const profileAt = useCallback((y: number, m: number) => profileFor(y, m)!, [profileFor]);
  if (!s.profile) return null;
  return (
    <ActivityScreen
      profile={s.profile} profileAt={profileAt} expenses={s.expenses} dismissed={s.dismissed} today={new Date()}
      onAdd={() => router.push('/depense')} onEdit={id => router.push({ pathname: '/depense', params: { id } })} onDelete={id => s.removeExpense(id)}
      onIgnore={s.dismissSuggestion} onAccept={sg => s.acceptSuggestion(sg, new Date())}
      linkFilter={linkFilter} linkKey={t}
      lastRemoved={s.lastRemoved} onUndoRemove={s.undoRemove} onClearRemoved={s.clearLastRemoved}
    />
  );
}
