---
name: feedback-delegation
description: Règle de délégation validée le 17/11/2026 (collecte volumineuse aux agents, réflexion gardée), où elle vit et ce qu'elle coûte
type: feedback
---

**La règle (ses mots, dans ses préférences claude.ai, reçue à chaque session)** : la collecte se délègue (texte de pages web et recherches simples → `haiku-collecte` ; extraction de code et recherches croisées → `sonnet-recherche` ; en parallèle si indépendant) ; réfléchir, résumer, interpréter, comparer, décider, écrire du code reste dans la session principale ; les retours des agents sont des matériaux bruts, vérifier soi-même les chiffres importants ; en cas de doute, garder la tâche.

**Les deux agents** ont été demandés et validés par lui le 30/10/2026. Leurs fiches sont maintenant dans ce dépôt : `.claude/agents/haiku-collecte.md` et `.claude/agents/sonnet-recherche.md` (chargement vérifié le 17/11/2026 ; versionnées, donc elles survivent au conteneur). Ils n'ont que des outils de lecture.

**Où vit la règle** : `~/.claude/CLAUDE.md` d'une session cloud est effacé avec le conteneur, donc l'écrire là ne sert à rien. Ce qui la rend valable partout, ce sont ses préférences claude.ai (déjà en place). Pour Nokori, elle est aussi dans `.claude/rules/delegation.md` : texte validé par lui le 17/11/2026 (avec l'ajout « collecte volumineuse » et « petite recherche → la faire soi-même »).

**Ce que ça coûte (mesuré le 17/11/2026)** : lire 18 sessions passées avec 3 agents Haiku en parallèle a consommé environ 940 000 tokens d'agents et 12 minutes. Un agent repart de zéro et son rapport est relu ici.

**Why:** il veut maîtriser le coût sans perdre en qualité.

**How to apply:**
- Déléguer quand la collecte est volumineuse (plusieurs pages web, beaucoup de fichiers, des transcriptions de sessions). Pour une petite recherche (un fichier, un grep, une page), la faire directement : c'est moins cher.
- Demander aux agents du mot pour mot avec la source, jamais un résumé.
- Si `haiku-collecte` n'a pas l'outil nécessaire (par exemple lire d'autres sessions), utiliser un agent général réglé sur Haiku. Si le réseau bloque ses lectures web, collecter par `curl` et le signaler.
