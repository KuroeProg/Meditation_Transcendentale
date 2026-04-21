# Backend Routes

Ce document recense les routes HTTP et WebSocket exposees par le backend Django/Channels.

## Regles generales

- Les routes definies avec `with_optional_trailing_slash` fonctionnent avec et sans slash final.
- La plupart des routes API supposent une session utilisateur valide dans `request.session['local_user_id']`.
- Les routes WebSocket passent par `AuthMiddlewareStack` dans l'ASGI app.
- Les routes `django_prometheus` sont incluses a la racine, mais leurs chemins exacts dependent du package installe.
- Les fichiers media sont servis uniquement en mode `DEBUG`.

## Base des routes

- Point d'entree HTTP: [transcendence/backend/transcendence_backend/urls.py](../../transcendence/backend/transcendence_backend/urls.py)
- Auth et profil: [transcendence/backend/accounts/urls.py](../../transcendence/backend/accounts/urls.py)
- Chat: [transcendence/backend/chat/urls.py](../../transcendence/backend/chat/urls.py)
- WebSocket ASGI: [transcendence/backend/transcendence_backend/asgi.py](../../transcendence/backend/transcendence_backend/asgi.py)

## HTTP - Auth, profil, amis

| Route | Methode | Auth | Usage |
|---|---|---|---|
| `/api/auth/42/login` | `GET` | Non | Demarre le flow OAuth 42 et redirige vers l'authorisation 42. |
| `/api/auth/42/callback` | `GET` | Non | Callback OAuth 42: echange le code, recupere le profil, ouvre la session et redirige vers le dashboard. |
| `/api/auth/login` | `GET`, `POST` | Non | Login local. `GET` redirige vers `/auth`, `POST` authentifie avec email/mot de passe et peut declencher la 2FA. |
| `/api/auth/logout` | `POST` | Oui | Ferme la session et met a jour la presence hors ligne. |
| `/api/auth/forgot-password` | `POST` | Non | Demande d'envoi d'un lien de reinitialisation de mot de passe. |
| `/api/auth/reset-password` | `POST` | Non | Applique un nouveau mot de passe a partir d'un token signe. |
| `/api/auth/me` | `GET` | Oui | Retourne le profil de l'utilisateur connecte. |
| `/api/auth/users/<user_id>` | `GET` | Oui | Retourne le profil public d'un utilisateur par ID. |
| `/api/auth/csrf` | `GET` | Non | Pose le cookie CSRF. |
| `/api/auth/seed-users` | `POST` | Non | Seed d'utilisateurs pour les tests e2e. |
| `/api/auth/register` | `POST` | Non | Inscription locale avec declenchement du code 2FA. |
| `/api/auth/verify-2fa` | `POST` | Non | Verification du code 2FA pour inscription ou login. |
| `/api/auth/resend-code` | `POST` | Non | Renvoi du code 2FA. |
| `/api/auth/me/update` | `PUT` | Oui | Mise a jour du profil: prenom, nom, bio, username, coalition. |
| `/api/auth/me/presence` | `POST` | Oui | Heartbeat de presence pour marquer l'utilisateur comme en ligne. |
| `/api/auth/me/avatar` | `POST` | Oui | Upload de l'avatar utilisateur. |
| `/api/auth/leaderboard` | `GET` | Oui | Retourne le classement par categorie de rating. |
| `/api/auth/search` | `GET` | Oui | Recherche d'utilisateurs par username via `q`. |
| `/api/auth/friends` | `GET` | Oui | Liste les relations d'amitie de l'utilisateur. |
| `/api/auth/friends/request` | `POST` | Oui | Envoie une demande d'ami ou transforme une demande pendante en relation acceptee. |
| `/api/auth/friends/<friendship_id>` | `PUT` | Oui | Action sur une relation: `accept`, `block`, `unblock`. |
| `/api/auth/friends/<friendship_id>` | `DELETE` | Oui | Supprime la relation. |

## HTTP - Chat et invites de jeu

| Route | Methode | Auth | Usage |
|---|---|---|---|
| `/api/chat/conversations` | `GET` | Oui | Liste les conversations de l'utilisateur. |
| `/api/chat/invites/pending-outgoing` | `GET` | Oui | Retourne l'invitation de jeu sortante en attente, avec gestion de l'expiration. |
| `/api/chat/conversations/create` | `POST` | Oui | Cree une conversation privee ou liee a un jeu. |
| `/api/chat/conversations/<conversation_id>/messages` | `GET` | Oui | Retourne les messages d'une conversation avec pagination. |
| `/api/chat/conversations/<conversation_id>/send` | `POST` | Oui | Envoie un message dans une conversation. |
| `/api/chat/conversations/<conversation_id>/invite` | `POST` | Oui | Cree et envoie une invitation de partie via une conversation. |
| `/api/chat/invites/<invite_id>/respond` | `POST` | Oui | Accepte ou refuse une invitation de jeu. |
| `/api/chat/invites/<invite_id>/cancel` | `POST` | Oui | Annule une invitation de jeu envoyee. |

## HTTP - Routes systeme

| Route | Methode | Auth | Usage |
|---|---|---|---|
| `/admin/` | Plusieurs | Admin | Interface d'administration Django. |
| `/media/...` | `GET` | Non | Fichiers media servis uniquement en `DEBUG`. |
| Routes `django_prometheus` | Selon le package | Selon config | Exposition des metriques Prometheus. |

## WebSocket

| Route WS | Consumer | Usage |
|---|---|---|
| `/ws/chess/matchmaking/` | `MatchmakingConsumer` | Matchmaking temps reel pour les parties d'echecs. |
| `/ws/chess/<game_id>/` | `GameConsumer` | Canal temps reel d'une partie. |
| `/ws/chat/<conversation_id>/` | `ChatConsumer` | Messages temps reel d'une conversation. |
| `/ws/notifications/<user_id>/` | `NotificationConsumer` | Notifications temps reel par utilisateur. |

## Points a retenir

- Les routes d'auth et de profil utilisent la session serveur, pas un token JWT.
- Les routes de chat et d'invitation verifient aussi que l'utilisateur appartient bien a la conversation ou a l'invitation.
- Les routes WebSocket utilisent la meme logique d'identification via session que le reste de l'application.
- Les endpoints d'invitation de jeu mettent a jour le message source dans la conversation pour garder un historique coherent.

## Fichiers utilises

- [transcendence/backend/transcendence_backend/urls.py](../../transcendence/backend/transcendence_backend/urls.py)
- [transcendence/backend/accounts/urls.py](../../transcendence/backend/accounts/urls.py)
- [transcendence/backend/chat/urls.py](../../transcendence/backend/chat/urls.py)
- [transcendence/backend/chat/routing.py](../../transcendence/backend/chat/routing.py)
- [transcendence/backend/game/routing.py](../../transcendence/backend/game/routing.py)
- [transcendence/backend/transcendence_backend/asgi.py](../../transcendence/backend/transcendence_backend/asgi.py)
