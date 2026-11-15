import { useRouter } from 'expo-router';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { useAppState } from '../state/AppState';

export default function Accueil() {
  const { profile, saveProfile } = useAppState();
  const router = useRouter();
  return (
    <OnboardingScreen
      initial={profile}
      onDone={async p => { await saveProfile(p); router.replace('/'); }}
    />
  );
}
