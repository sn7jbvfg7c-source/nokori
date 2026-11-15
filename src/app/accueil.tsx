import { useLocalSearchParams, useRouter } from 'expo-router';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { useAppState } from '../state/AppState';

export default function Accueil() {
  const { profile, saveProfile } = useAppState();
  const router = useRouter();
  const { supprime } = useLocalSearchParams<{ supprime?: string }>();
  return (
    <OnboardingScreen
      initial={profile}
      deleted={supprime === '1' && !profile}
      onLegal={doc => router.push({ pathname: '/legal/[doc]', params: { doc } })}
      onRestore={() => router.push('/sauvegarde')}
      onDone={async p => { await saveProfile(p); if (router.canGoBack()) router.back(); else router.replace('/'); }}
    />
  );
}
