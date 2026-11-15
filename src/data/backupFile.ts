/**
 * Fichier de sauvegarde, version web : téléchargement et choix d'un fichier dans le navigateur.
 * Sur téléphone, c'est backupFile.native.ts (feuille de partage et sélecteur de fichiers).
 */
import * as DocumentPicker from 'expo-document-picker';

export const randomBytes = (n: number): Uint8Array => {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
};

/** Propose le fichier à l'utilisateur. Renvoie false s'il n'a pas pu être proposé. */
export async function shareBackup(text: string, name: string): Promise<boolean> {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return false;
  const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
  const a = doc.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  doc.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

/** Laisse choisir un fichier ; renvoie son texte, ou null si l'utilisateur annule */
export async function pickBackup(): Promise<string | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  if (a.size !== undefined && a.size > 20_000_000) return '\u0000trop-gros';
  return a.file ? a.file.text() : null;
}
