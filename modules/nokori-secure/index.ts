import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

const native = Platform.OS === 'android' ? requireOptionalNativeModule<{ setSecure(on: boolean): Promise<void> }>('NokoriSecure') : null;

/** Android : masque l'aperçu dans les apps récentes et bloque les captures. Sans effet ailleurs (iOS : voile de LockGate). */
export function setSecureWindow(on: boolean): void {
  native?.setSecure(on).catch(() => {});
}
