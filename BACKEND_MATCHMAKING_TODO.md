# Backend matchmaking roadmap

Objectif: mettre a jour le backend pour gerer les nouvelles cadences, les increments et le mode competitive/amical, puis brancher la persistance et le rating correctement.

## Etape 1 - Contrat matchmaking

Statut: fait

Travail:
- Autoriser les temps de partie correspondant aux nouvelles cadences, y compris correspondence (1, 3 et 7 jours).
- Lire et valider le champ `competitive` envoye par le frontend.
- Differencier les queues par cadence, increment et mode de jeu.
- Renvoyer les metadonnees utiles dans les messages WebSocket de matchmaking.

Commit propose:
- `feat(matchmaking): support extended time controls and competitive flag`

## Etape 2 - Etat de partie et persistence

Statut: a faire

Travail:
- Enrichir l'etat Redis initial avec les metadonnees de partie (categorie, increment, mode, rated ou non).
- Propager ces informations jusqu'a la sauvegarde finale.
- Ajouter les champs manquants au modele `Game` si necessaire.
- Creer la migration associee.

Commit propose:
- `feat(game): persist match settings in game state and history`

## Etape 3 - Horloge et longes cadences

Statut: a faire

Travail:
- Verifier que la logique de clock supporte les parties longues sans boucle couteuse inutile.
- Ajuster le comportement pour correspondence si on decide un calcul lazy au lieu du tick 1s permanent.
- S'assurer que la reconnexion restaure correctement le temps restant.

Commit propose:
- `refactor(clock): handle long correspondence games safely`

## Etape 4 - Classement et rating

Statut: a faire

Travail:
- Definir la logique de rating pour les parties competitives.
- Brancher la mise a jour de ELO sur la fin de partie.
- Prevoir un leaderboard par categorie si on veut separer bullet, blitz, rapid et correspondence.

Commit propose:
- `feat(rating): update ELO by game category`

## Etape 5 - Verification et hygiene

Statut: a faire

Travail:
- Ajouter ou mettre a jour les tests critiques autour du matchmaking et de la clock.
- Verifier les events WS et la sauvegarde finale sur les cas bullet, blitz, rapid et correspondence.
- Documenter les limites et le comportement attendu dans le README si besoin.

Commit propose:
- `test(docs): cover matchmaking timing and game persistence`

## Ordre de livraison conseille

1. Etape 1
2. Etape 2
3. Etape 3
4. Etape 4
5. Etape 5

## Notes

- Garder des commits petits et lisibles.
- Un commit par etape, sauf si une migration impose un ajustement mineur a la meme PR.
- Si une etape decouvre un probleme structurel, ouvrir un commit de correction cible au lieu de melanger plusieurs sujets.
