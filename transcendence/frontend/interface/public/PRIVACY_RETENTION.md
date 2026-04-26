# Données personnelles — conservation (Transcendence)

Document à jour pour l’interface web (session, chat, parties d’échecs). Les durées ci-dessous sont des **ordres de grandeur** configurables en production (variables d’environnement, TTL Redis).

## Session navigateur

- **Cookie de session** : lié à la connexion (42 ou locale). Expire selon la configuration Django / durée d’inactivité côté serveur. La déconnexion manuelle invalide la session immédiatement.

## Présence « en ligne »

- **Redis** : clés `presence:last_seen:<user_id>` et `presence:connections:<user_id>` avec TTL d’environ **90 secondes** (valeur par défaut `PRESENCE_HEARTBEAT_TTL_SECONDS`). Sans ping client, l’utilisateur est considéré hors ligne même si la base affichait encore `is_online`.

## Partie d’échecs en cours

- **Redis** : clé `active_game:<user_id>` → identifiant de partie, TTL **2 heures** (`ACTIVE_GAME_TTL`). Sert à savoir si un joueur est déjà engagé (invitations, liste d’amis). Effacée à la fin de partie ou à la suppression RGPD.

## Invitations de partie (chat)

- **En attente** : TTL logique d’environ **5 minutes** côté application (`expires_at` sur `GameInvite`). Passé ce délai, l’invitation est marquée expirée.

## Messages et conversations (chat)

- **Conservation** : conservés tant que les comptes participants existent. Une **suppression de compte (RGPD)** retire le compte des conversations privées, supprime les messages **émis** par l’utilisateur, retire les accusés de lecture associés, et anonymise le profil ; les messages des autres interlocuteurs dans les fils communs peuvent rester visibles pour eux.

## Historique des parties (base de données)

- **Parties terminées** : conservées pour l’historique et les classements. Après anonymisation RGPD, les références joueur pointent vers le compte anonymisé (`deleted_<id>`) ; les Elo et issues de partie restent exploitables de façon agrégée.

## Export de données

- **GET `/api/auth/me/export-data`** : instantané JSON (profil, préférences, parties, invitations, conversations dont tu es membre et messages associés, avec limite sur le nombre de messages pour éviter les réponses trop lourdes). Chaque téléchargement est **journalisé** côté serveur (action `rgpd_export`).

## Suppression / anonymisation

- **POST `/api/auth/me/delete-data`** avec confirmation : journalisation `rgpd_delete`, invalidation session, nettoyage Redis présence et marqueur `active_game` pour l’utilisateur.

Pour le détail des champs exportés et supprimés, voir la section RGPD dans la documentation d’intégration du dépôt (`docs/BACKEND_IN_GAME_SOCIAL.md`, section 9.7 et suivantes).
