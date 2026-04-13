# Plan de realisation - Defier un ami

Date: 13 avril 2026
Branche: feature/friend-challenge-orchestration

## Etat d'avancement

- [x] Etape 1 lancee: base backend invitation dediee ajoutee (modele + migration)
- [x] Etape 2 lancee: endpoints metier create/respond/cancel avec idempotence (socle backend)
- [x] Etape 3 lancee: creation game online sur accept (backend invite->game_id)
- [x] Etape 4 lancee: evenements temps reel invite_created/invite_updated/game_ready (backend)
- [x] Etape 5 lancee: CTA prioritaire global (frontend shell)
- [x] Etape 6 lancee: desactivation boutons Defier quand pending sortante
- [x] Etape 7 lancee: auto-cancel sender_busy au demarrage online (frontend trigger)
- [x] Etape 8 lancee: expiration TTL (a l'acces) + resync reconnexion pending-outgoing
- [x] Etape 9 terminee: validation E2E OK (checklist FRIEND_CHALLENGE_QA.md)

## 1) Decisions produit validees

- UX: CTA prioritaire quand une invitation est acceptee pendant la navigation.
- Scope: online uniquement.
- Regle d'unicite: une seule invitation sortante en statut pending par joueur.
- UI: tous les boutons Defier sont inactifs tant qu'une invitation sortante pending existe.
- Coherence metier: si le joueur entre dans une partie online alors qu'une invitation sortante est en attente, cette invitation est annulee automatiquement.

## 2) Objectifs fonctionnels

- Eviter les parties fantomes et les etats incoherents.
- Garantir une source de verite unique pour l'etat des invitations.
- Assurer une UX claire en multi-onglets, reconnexion et latence reseau.

## 3) Machine a etats de l'invitation

Statuts:
- pending
- accepted
- declined
- cancelled
- expired

Transitions autorisees:
- pending -> accepted (receveur uniquement)
- pending -> declined (receveur uniquement)
- pending -> cancelled (emetteur ou systeme)
- pending -> expired (systeme TTL)

Contraintes:
- Toute action sur une invitation deja traitee est idempotente.
- Une seule invitation sortante pending par emetteur (contrainte forte backend).

## 4) Contrat de donnees

Champs minimum d'une invitation:
- invite_id
- sender_id
- receiver_id
- status
- cancel_reason (manual_cancel, sender_busy, system)
- created_at
- expires_at
- game_id (present si accepted)
- time_control
- increment
- competitive

## 5) API metier a implementer

- POST /invite
  - Cree une invitation si et seulement si aucune pending sortante n'existe pour l'emetteur.
  - Retourne l'invitation creee.

- POST /invite/respond
  - Actions: accept, decline.
  - Atomique et idempotent.
  - Si accept: creation immediate d'un game_id online.

- POST /invite/cancel
  - Annulation manuelle par l'emetteur.

- Service/endpoint d'auto-cancel au demarrage de partie online
  - Raison: sender_busy.

Codes d'erreur metier attendus:
- already_processed
- sender_already_has_pending
- invite_not_allowed
- invite_expired

## 6) Evenements temps reel

Evenements globaux:
- invite_created
- invite_updated
- game_ready

Payload minimum de game_ready:
- invite_id
- game_id
- sender_id
- receiver_id

Exigence:
- Les deux joueurs recoivent les memes transitions d'etat.

## 7) UX cible

### CTA prioritaire

Quand une invitation est acceptee pendant la navigation:
- Afficher un CTA prioritaire global.
- Actions:
  - Rejoindre maintenant -> redirection vers /game/:gameId
  - Plus tard -> conserve un acces persistant vers la partie prete

### Boutons Defier

- Si invitation sortante pending existe:
  - Boutons Defier desactives partout (profil, chat, autres points d'entree).
  - Message contextuel: Invitation deja en attente.

### Mise a jour d'etat

- Les cartes invitation affichent toujours l'etat reel:
  - pending, accepted, declined, cancelled, expired

## 8) Regles de coherence online only

Triggers d'auto-cancel sender_busy:
- Entree en matchmaking online.
- Join/create game online direct.
- Acceptation d'une autre invitation online.

Hors scope de l'auto-cancel:
- Training/local (si non considere comme partie online)

## 9) Cas limites obligatoires

- Acceptation concurrente (double clic, multi-onglets): une seule transition valide.
- Annulation juste avant acceptation: resultat unique coherent pour les deux.
- Reconnexion: rechargement de l'etat serveur en priorite.
- Expiration TTL: impossible de lancer la partie apres expiration.

## 10) Plan de livraison par etapes

1. Rediger la specification courte (etat, transitions, API, UX).
2. Mettre en place la structure d'invitation et la contrainte une pending sortante.
3. Implementer create/respond/cancel avec idempotence.
4. Brancher creation de partie online sur accept.
5. Emettre les evenements temps reel invite/game_ready.
6. Integrer CTA prioritaire global dans le shell app.
7. Desactiver les boutons Defier tant qu'une pending sortante existe.
8. Implementer auto-cancel sender_busy au demarrage online.
9. Ajouter expiration TTL et resynchronisation reconnexion.
10. Valider en tests E2E + checklist metier.

## 11) Definition of Done

- Une seule invitation sortante pending par joueur est appliquee partout.
- Les boutons Defier sont inactifs des qu'une pending sortante existe.
- L'acceptation d'une invitation pendant la navigation declenche un CTA prioritaire global.
- Le demarrage d'une partie online annule automatiquement la pending sortante.
- Aucune incoherence observee en multi-onglets, reconnexion, double action.

## 12) Checklist QA minimale

- A envoie une invitation -> B accepte pendant navigation de A -> A voit le CTA prioritaire.
- A envoie une invitation -> A lance une partie online -> invitation auto-annulee chez B.
- A a une pending -> tous les boutons Defier sont desactives.
- Invitation expiree -> impossible de rejoindre une partie depuis cette invitation.
- Double action rapide -> etat final unique, sans duplication de partie.
