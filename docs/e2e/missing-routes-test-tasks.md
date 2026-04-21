# Backlog des tests e2e manquants (hors Prometheus et Media)

Objectif: couvrir uniquement les routes backend encore non testees dans les specs e2e actuelles, sans dupliquer les tests deja existants.

Perimetre exclu:
- Routes Prometheus
- Routes Media

Source de verite de couverture:
- [docs/e2e/backend-routes-e2e-report.md](backend-routes-e2e-report.md)

## Priorite P0 - Auth critique

### T1 - Inscription locale
- Route: /api/auth/register
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/critical/auth-register.spec.js
- Scenarios a implementer:
  - Nominal: inscription valide retourne status attendu et bascule UI vers etape 2FA.
  - Erreur metier: email deja utilise ou username deja pris.
- Done quand:
  - 1 test nominal + 1 test erreur passent en CI.

### T2 - Renvoi code 2FA
- Route: /api/auth/resend-code
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/critical/auth-2fa-resend.spec.js
- Scenarios a implementer:
  - Nominal: renvoi code depuis ecran 2FA.
  - Erreur: token pre-auth invalide ou expire.
- Done quand:
  - Le flux garde l'utilisateur sur l'ecran 2FA et affiche feedback adapte.

### T3 - Mot de passe oublie
- Route: /api/auth/forgot-password
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/critical/auth-forgot-password.spec.js
- Scenarios a implementer:
  - Nominal: message generique de confirmation.
  - Robustesse: meme message pour email inconnu (pas de fuite d'information).
- Done quand:
  - Le comportement UX est identique pour compte existant/non existant.

### T4 - Reinitialisation mot de passe
- Route: /api/auth/reset-password
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/critical/auth-reset-password.spec.js
- Scenarios a implementer:
  - Nominal: token valide + nouveau mot de passe accepte.
  - Erreur: token invalide/expire.
- Done quand:
  - Les codes retour et messages UI sont verifies.

### T5 - Callback OAuth 42
- Route: /api/auth/42/callback
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/extended/auth-oauth-callback.spec.js
- Scenarios a implementer:
  - Nominal: callback avec code/state valides.
  - Erreur securite: state invalide.
- Done quand:
  - Navigation et gestion d'erreur sont confirmees.

## Priorite P1 - Social et profil

### T6 - Recherche utilisateurs
- Route: /api/auth/search
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/extended/profile-search-users.spec.js
- Scenarios a implementer:
  - Nominal: q >= 2 retourne des resultats.
  - Cas limite: q trop court retourne liste vide.
- Done quand:
  - Le rendu de la liste et le cas vide sont verifies.

### T7 - Profil public par ID
- Route: /api/auth/users/<user_id>
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/extended/profile-public-user.spec.js
- Scenarios a implementer:
  - Nominal: utilisateur existant.
  - Erreur: utilisateur introuvable.
- Done quand:
  - La vue cible et les erreurs sont couvertes.

### T8 - Demande d'ami
- Route: /api/auth/friends/request
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/extended/friends-request.spec.js
- Scenarios a implementer:
  - Nominal: creation demande.
  - Erreur: auto-demande ou deja existante.
- Done quand:
  - Les transitions d'etat attendues sont verifiees.

### T9 - Actions relation d'amitie
- Route: /api/auth/friends/<friendship_id>
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/extended/friends-actions.spec.js
- Scenarios a implementer:
  - PUT accept
  - PUT block
  - PUT unblock
  - DELETE relation
- Done quand:
  - Chaque action a au moins un test nominal.

## Priorite P1 - Chat HTTP non couvert

### T10 - Creation conversation
- Route: /api/chat/conversations/create
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/extended/chat-create-conversation.spec.js
- Scenarios a implementer:
  - Nominal: creation conversation privee.
  - Cas dedoublonnage: conversation deja existante.
- Done quand:
  - Le thread cible est ouvert/selectionne comme attendu.

### T11 - Envoi message via HTTP
- Route: /api/chat/conversations/<conversation_id>/send
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/extended/chat-send-http-route.spec.js
- Scenarios a implementer:
  - Nominal: envoi HTTP reussi.
  - Erreur: contenu vide ou non autorise.
- Done quand:
  - Le flux UI gere correctement succes et erreur API.

### T12 - Annulation invitation jeu
- Route: /api/chat/invites/<invite_id>/cancel
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/extended/chat-invite-cancel-http.spec.js
- Scenarios a implementer:
  - Nominal: annulation par l'emetteur.
  - Erreur: invitation deja traitee.
- Done quand:
  - Etat de carte invite synchronise apres reponse API.

## Priorite P2 - Support e2e interne

### T13 - Seed utilisateurs e2e
- Route: /api/auth/seed-users
- Statut actuel: non couvert
- Fichier suggere: transcendence/frontend/interface/tests/e2e/setup/seed-users.spec.js
- Scenarios a implementer:
  - Nominal: endpoint retourne ok et stats minimales attendues.
- Done quand:
  - Le test peut etre execute uniquement sur profil e2e local/ci dedie.

## Hors backlog actuel

- /admin/ n'est pas planifie ici (hors parcours utilisateur e2e frontend).
- Prometheus et Media explicitement exclus de ce plan.

## Ordre d'implementation recommande

1. T1, T3, T4
2. T2, T5
3. T8, T9
4. T10, T11, T12
5. T6, T7
6. T13

## Definition of Done globale

- Chaque route du backlog a au moins:
  - 1 scenario nominal
  - 1 scenario d'erreur (sauf T13)
- Les tests sont ranges dans critical/extended selon impact.
- Aucun doublon avec les specs deja presentes.
- Les tests passent localement et en CI sans flakiness notable.
