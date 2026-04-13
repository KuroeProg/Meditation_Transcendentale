# QA E2E - Friend Challenge

Date: 13 avril 2026
Branche: feature/friend-challenge-orchestration
Scope: online only, CTA prioritaire, une seule pending sortante globale

## Pre-requis

- 2 comptes: Joueur A et Joueur B
- Relation d'amis deja acceptee
- Les 2 utilisateurs connectes dans 2 sessions distinctes (2 navigateurs ou 2 profils)
- Environnement backend/frontend demarre

## Observation rapide (a garder ouverte)

- Ouvrir DevTools Network sur les 2 sessions
- Surveiller:
  - POST /api/chat/conversations/:id/invite
  - POST /api/chat/invites/:invite_id/respond
  - POST /api/chat/invites/:invite_id/cancel
  - GET /api/chat/invites/pending-outgoing
- Surveiller notifications websocket user_x (event action)

## Scenario 1 - Envoi invitation standard

1. A ouvre le chat avec B et clique Defier
2. A envoie l'invitation
3. Verifier resultat:
- API create invite en 201
- payload contient message + invite
- invite.status = pending
- invite_id est present dans le message
- bouton Defier desactive chez A partout (chat + profil)

## Scenario 2 - Pending unique globale

1. Tant que l'invitation A->B est pending, A tente de defier C
2. Verifier resultat:
- boutons Defier inactifs
- aucun nouvel appel create invite valide
- si appel force, backend repond sender_already_has_pending

## Scenario 3 - Acceptation pendant navigation (CTA prioritaire)

1. A envoie invite puis navigue (profil, settings, dashboard)
2. B accepte l'invitation depuis la carte
3. Verifier resultat A:
- evenement websocket game_ready recu
- CTA prioritaire visible globalement
- action Plus tard ferme le CTA sans redirection forcee
- action Rejoindre redirige vers /game/:gameId

4. Verifier resultat B:
- redirection vers /game/:gameId apres accept (depuis la carte)

## Scenario 4 - Annulation manuelle par l'emetteur

1. A envoie invite a B
2. A clique Annuler sur la carte
3. Verifier resultat:
- invite.status = cancelled
- reason = manual_cancel
- B voit l'etat annule et ne peut plus accepter

## Scenario 5 - Refus par le receveur

1. A envoie invite
2. B clique Refuser
3. Verifier resultat:
- invite.status = declined
- A recoit invite_updated
- CTA game_ready non emis

## Scenario 6 - Auto-cancel sender_busy

1. A envoie invite a B
2. Sans attendre la reponse, A rejoint une partie online (/game/:id online)
3. Verifier resultat:
- frontend A appelle cancel invite reason=sender_busy
- invite.status = cancelled
- cancel_reason = sender_busy
- B ne peut plus accepter

## Scenario 7 - Resync apres reload/reconnexion

1. A cree une invite pending
2. A recharge la page
3. Verifier resultat:
- GET /api/chat/invites/pending-outgoing retourne la pending
- boutons Defier restent desactives

## Scenario 8 - Expiration TTL (verification acces)

1. A envoie invite
2. Attendre depassement TTL
3. Forcer un acces sur pending-outgoing ou action respond/cancel
4. Verifier resultat:
- status passe a expired
- invite devient non actionnable

## Scenario 9 - Idempotence / concurrence

1. B double-clique rapidement sur Accepter
2. Verifier resultat:
- une seule transition effective
- autres appels renvoient already_processed
- un seul game_id final

## Critere de validation finale

- Aucune invitation pending incoherente apres changement d'etat
- Un seul game_id cree en cas d'accept
- Aucun defy possible tant que pending sortante existe
- CTA prioritaire fonctionne sans redirection forcee
- Auto-cancel sender_busy applique sur entree online

## Resultats

- [x] Scenario 1 OK
- [x] Scenario 2 OK
- [x] Scenario 3 OK
- [x] Scenario 4 OK
- [x] Scenario 5 OK
- [x] Scenario 6 OK
- [x] Scenario 7 OK
- [x] Scenario 8 OK
- [x] Scenario 9 OK

Decision recette:
- [x] GO
- [ ] NO GO

Notes:
- 
