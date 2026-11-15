/**
 * Fichier de sauvegarde sur iPhone et Android.
 * Export : le fichier chiffré est écrit dans le cache de l'app, proposé par la feuille de partage
 * (Fichiers, AirDrop, Drive, e-mail…), puis effacé du cache. Rien ne part sans que l'utilisateur choisisse.
 * Import : sélecteur de fichiers du système ; la copie temporaire est effacée après lecture.
 */
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const randomBytes = (n: number): Uint8Array => Crypto.getRandomValues(new Uint8Array(n));

export async function shareBackup(text: string, name: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, name);
  try {
    if (file.exists) file.delete();
    file.create();
    await file.write(text);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/octet-stream', UTI: 'public.data', dialogTitle: 'Enregistrer la sauvegarde Nokori' });
    return true;
  } finally {
    try { if (file.exists) file.delete(); } catch { /* le système videra le cache */ }
  }
}

export async function pickBackup(): Promise<string | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  if (a.size !== undefined && a.size > 20_000_000) return '\u0000trop-gros';
  const file = new File(a.uri);
  try { return await file.text(); }
  finally { try { if (file.exists) file.delete(); } catch { /* copie temporaire */ } }
}
