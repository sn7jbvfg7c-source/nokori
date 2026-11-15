import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useColors } from '../theme/theme';
import { Button, EmptyState } from '../ui/kit';

/** Adresse inconnue (lien mal copié) : une page en français plutôt que la page anglaise par défaut */
export default function NotFound() {
  const c = useColors();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: c.paper, justifyContent: 'center', padding: 24 }}>
      <EmptyState icon="compass" title="Page introuvable" text="Ce lien ne mène nulle part dans Nokori."
        action={<Button label="Ouvrir mon budget" onPress={() => router.replace('/')} />} />
    </View>
  );
}
