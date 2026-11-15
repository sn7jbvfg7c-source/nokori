/** La vidéo de présentation n'existe que dans la version web (le site de test) : rien sur téléphone. */
export const presentationAvailable = false;
export function PresentationVideo(_: { visible: boolean; onClose: () => void }) { return null; }
