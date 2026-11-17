# Sessions courtes (économie de tokens)

Je ne peux pas taper `/clear` ni `/compact` moi-même. Claude Code résume déjà la conversation tout seul quand elle devient trop longue. Donc :

- **Fin d'une tâche terminée** : mettre à jour `.claude/memory/en-cours.md` (10 lignes maximum : date, ce qui est fait, ce qui reste, question en attente), faire un commit, puis finir ma réponse par une ligne : « Tu peux faire /clear, je reprendrai d'ici. »
- **Nouveau sujet dans une session déjà longue** : proposer `/clear` avant de commencer.
- **Début de session ou après `/clear`** : `en-cours.md` est chargé automatiquement ; commencer ma première réponse par 2 ou 3 lignes « On en était à… », puis répondre à la demande.
- `en-cours.md` se réécrit à chaque fois (pas d'historique, git le garde) ; ce qui doit durer va dans les autres fichiers de mémoire.
