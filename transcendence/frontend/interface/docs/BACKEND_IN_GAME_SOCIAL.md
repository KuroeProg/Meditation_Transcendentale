# Branchement backend — panneau in-game, social, stats et historique

Ce document synthétise **toutes les données mock** du frontend (`interface/`) et les **routes HTTP / WebSocket** à respecter pour que le backend puisse tout brancher sans relire le code. Les chemins ci-dessous sont ceux attendus par le SPA (proxy Vite → Django) sauf mention contraire.

---

## 1. Inventaire des mocks frontend

| Fichier | Rôle | Branché API ? |
|---------|------|----------------|
| `src/features/stats/assets/mockPersonalStats.json` | Stats globales + **`gamePanel`** (résumé partie, cartes fin de partie, annales courtes `recentGames`, liste simplifiée `friends`, **`friendsRoster`** détaillé) | Partiel : `friends` API ; le reste = mock |
| `src/features/history/assets/mockHistoryData.json` | Page **Histoire** complète (`player`, `games[]`, `filters`, `communityPanel`, `puzzleRecommendations`) | Non — JSON statique dans `HistoryPage.jsx` |
| `src/mock/mockSessionUser.js` | Session **dev uniquement** (`VITE_DEV_MOCK_USER`) — pas d’appel `/api/auth/me` | N/A (hors prod) |
| `src/features/chess/mock/mockGameOpponent.js` | Joueur noir fictif en dev hot-seat | N/A |
| Tests e2e `tests/e2e/helpers/wsMocks.js` | Simule `ws/chess`, `ws/chat`, `ws/notifications` | Référence pour formes WS attendues côté client |

Services qui **lisent encore le mock** alors qu’une API existe ailleurs :

- `profileStatsFromMock.js` → fusion `user.stats` (session) avec `mockPersonalStats.profileSummary`.
- Page `Statistics.jsx` → tout le JSON mock pour graphiques / métriques.
- `GameStatsPanel.jsx` → `mockPersonalStats.gamePanel` pour tuiles fin de partie, annales in-game, roster enrichi ; seule la liste **`GET /api/auth/friends?status=accepted`** est réelle.

---

## 2. Routes backend déjà exposées (Django)

À ne pas réinventer : le frontend ou des modules existants les appellent déjà.

### 2.1 Comptes & amis (`path('api/auth/', include('accounts.urls'))`)

| Méthode | Route | Usage frontend | Réponse schématique |
|---------|--------|----------------|---------------------|
| `GET` | `/api/auth/me` | Session profil | Objet utilisateur (+ `stats` optionnel pour profil) |
| `GET` | `/api/auth/csrf` | CSRF cookie | — |
| `POST` | `/api/auth/logout` | Déconnexion | — |
| `GET` | `/api/auth/search?q=` | Recherche utilisateurs (`chatApi.js`) | JSON liste users |
| `GET` | `/api/auth/leaderboard` | Dashboard (`?category=` optionnel) | Classement |
| `GET` | `/api/auth/friends` | Liste relations | `{ friends: Contact[] }` |
| `GET` | `/api/auth/friends?status=accepted` | **GameStatsPanel**, Profile, Dashboard | Idem — filtre `status` |
| `POST` | `/api/auth/friends/request` | Demande d’ami | Contact |
| `PUT` | `/api/auth/friends/<friendship_id>` | `action`: accept, block, unblock | Contact |
| `DELETE` | `/api/auth/friends/<friendship_id>` | Supprimer ami | `{ ok: true }` |
| `POST` | `/api/auth/me/presence` | Heartbeat présence (`chatApi.presencePing`) | — |
| `PUT` | `/api/auth/me/update` | Profil | — |
| `POST` | `/api/auth/me/avatar` | Avatar | — |

**Forme actuelle d’un contact** (`accounts/views/friends.py` — `_friendship_to_contact`) :

```json
{
  "friendship_id": 1,
  "user": {
    "id": 802,
    "username": "…",
    "avatar": "https://…",
    "coalition": "feu",
    "is_online": true
  },
  "status": "accepted",
  "is_sender": false,
  "created_at": "2026-04-22T12:00:00+00:00"
}
```

### 2.2 Chat & invitations partie (`path('api/chat/', include('chat.urls'))`)

Implémenté côté `chatApi.js` (sauf branchement `InGameChat.jsx`).

| Méthode | Route | Corps / query | Rôle |
|---------|--------|-----------------|------|
| `GET` | `/api/chat/conversations` | — | Liste des conversations du user |
| `GET` | `/api/chat/invites/pending-outgoing` | — | Invit en cours (`AuthContext` — `{ invite \| null }`) |
| `POST` | `/api/chat/conversations/create` | `{ participant_id, type, game_id? }` | Crée ou retrouve conversation (dont `type` = `game` possible) |
| `GET` | `/api/chat/conversations/<id>/messages` | `offset`, `limit` | Historique messages |
| `POST` | `/api/chat/conversations/<id>/send` | `{ content, message_type? }` | Envoi message (CSRF) |
| `POST` | `/api/chat/conversations/<id>/invite` | temps, mode compétitif, etc. | Défi échiquier depuis le chat |
| `POST` | `/api/chat/invites/<id>/respond` | `{ action }` | Accepter / refuser invitation |
| `POST` | `/api/chat/invites/<id>/cancel` | `{ reason? }` | Annuler invitation |

**Note importante — `InGameChat.jsx`** : les commentaires mentionnent `GET …/conversations/?type=game&game_id=` et `POST …/messages/`. Le code produit utilise plutôt :

- création / résolution : **`POST /api/chat/conversations/create`** avec `type: "game"` et `game_id` + `participant_id` (adversaire) ;
- envoi HTTP : **`POST /api/chat/conversations/<id>/send`** (pas `/messages/` en POST).

Option backend pour retrouver une conversation de partie sans la recréer : étendre **`GET /api/chat/conversations`** avec des query params `type=game&game_id=<uuid>` qui renvoie une seule conversation ou filtre la liste — aujourd’hui le client peut aussi filtrer la liste complète si `game_id` est présent dans chaque `Conversation.to_dict()`.

### 2.3 WebSockets (Channels)

| URL | Rôle |
|-----|------|
| `WS /ws/chat/<conversation_id>/` | Chat temps réel (`useChatSocket.js`) — auth `user_id`, actions `send_message`, `typing`, etc. |
| `WS /ws/chess/…` | Matchmaking / partie (Mocks e2e : chemins sous `/ws/chess/`) |
| `WS /ws/notifications/<user_id>/` | Notifications utilisateur (e2e + appli) |

---

## 3. Extensions attendues pour le panneau in-game (social)

### 3.1 `GET /api/auth/friends?status=accepted` — champs à ajouter sur `user`

Le composant `FriendsView.jsx` fusionne la réponse API avec **`friendsRoster`** du mock pour les champs manquants. Pour supprimer le mock, enrichir chaque `user` (ou l’entrée complète) avec :

| Champ | Type | Description |
|-------|------|-------------|
| `elo_rapid` ou `elo` | number | ELO rapide affiché |
| `active_game_id` | string \| null | Id partie Redis / route `/game/:id` — active **Regarder** |
| `active_game_label` | string | Optionnel — ex. « Rapide — tour 18 » |
| `title` | string | Optionnel — titre / noblesse |
| `streak` | `{ kind: 'wins' \| 'losses' \| 'neutral', count: number }` | Optionnel |
| `trend` | `'up' \| 'down' \| 'flat'` | Optionnel |
| `rivalry` | `{ wins, losses, is_opponent_coalition? }` | Face-à-face ; le frontend accepte aussi `isOpponentCoalition` (camelCase) |
| `last_activity` ou `lastActivity` | `{ kind: 'seen' \| 'last_game', label: string }` | Activité |

**Normalisation** : privilégier **`snake_case`** côté API ; le frontend gère encore camelCase (`activeGameId`, `lastActivity`, …) pour transition.

---

## 4. Routes stats & historique — à implémenter (contrats issus des mocks)

Aucune de ces routes n’est requise pour jouer une partie ; elles alimentent **GameStatsPanel** (onglets fin de partie + Annales), **Statistics**, **HistoryPage**.

### 4.1 Résumé profil & tuiles fin de partie (`mockPersonalStats`)

**Source mock** : `profileSummary` + `gamePanel` (`gamesPlayed`, `winrate`, `eloRating`, `eloChange`).

Proposition :

- `GET /api/stats/me/summary` ou enrichir **`GET /api/auth/me`** avec :

```json
{
  "wins": 12,
  "losses": 8,
  "rank": 42,
  "level": 3,
  "games_played": 1080,
  "winrate": 58,
  "elo_rating": 1785,
  "elo_change": -25
}
```

Types alignés sur `SummaryCards.jsx` et `resolveProfileGameStats`.

### 4.2 Annales courtes (in-game) — `recentGames`

**Source mock** : `mockPersonalStats.gamePanel.recentGames[]`.

Proposition :

- `GET /api/games/history?scope=recent&limit=20`

**Élément de liste** (champs utilisés par `HistoryView.jsx` in-game ; sur-ensemble compatible page Histoire) :

| Champ | Type | Notes |
|-------|------|--------|
| `id` | string | Id partie |
| `result` | `"win"` \| `"loss"` \| `"draw"` | |
| `score` | string | ex. `"1-0"` |
| `format` | string | `blitz`, `rapid`, `classical`, `puzzle` |
| `formatLabel` | string | Affichage |
| `opponent` | `{ username, coalition, elo, isBot }` | |
| `relativeDate` | string | Préformaté ou i18n côté client |
| `date` | string ISO | |
| `moveCount` | number | |
| `duration` | string | |
| `accuracy` | `{ me: number, opponent: number }` | Optionnel |
| `evalTrend` | number[] | Optionnel — courbe mini |
| `capturedByMe` / `capturedByOpponent` | `Record<string, number>` | Clés `p,n,b,r,q` |
| `analysisStatus` | string | ex. `analyzed`, `pending` |
| `competitive` | bool | |

### 4.3 Page Histoire complète (`mockHistoryData.json`)

Le commentaire du JSON suggère **`GET /api/history/`** — même contrat que la racine du fichier mock :

- `player` : profil synthétique + ELO ;
- `games[]` : comme ci-dessus **+** `timeControl`, `player` (eloAfter, eloChange), `shortPgn`, `missedWins`, `blunders` ;
- `filters` : listes `{ id, label }` pour périodes, formats, résultats, modes (peuvent rester statiques côté client si préféré) ;
- `communityPanel` : `coalitionRank`, `globalRank`, `trophies[]`, `activityFeed[]`, `rivalryRank` ;
- `puzzleRecommendations[]`.

Query possibles : `period`, `format`, `result`, `mode`, `page`, `limit`.

### 4.4 Page Statistiques (graphes)

**Source** : même `mockPersonalStats.json` (`winrates`, `perfOverTime`, `perfAdvantage`, `pieceUsage`, `metrics`).

Proposition :

- `GET /api/stats/me/detail` retournant les sections optionnelles du JSON mock pour alimenter `Statistics.jsx` sans fichier local.

---

## 5. Invitations « Défier » (amis)

Le flux **déjà câblé** passe par le **chat** : après `POST /api/chat/conversations/create`, `POST …/invite` avec contrôle de temps (voir `chatApi.sendGameInviteHttp`). Le handler `FriendsView` en dev ne fait qu’un `console.info` ; l’intégration produit peut :

1. Ouvrir le chat avec l’ami et appeler les endpoints ci-dessus, ou  
2. Exposer un raccourci dédié (ex. `POST /api/games/invites`) — **non présent** aujourd’hui ; reste décision produit.

---

## 6. Synthèse priorité backend

| Priorité | Sujet | Action |
|----------|--------|--------|
| Haute | Amis in-game | Enrichir `GET /api/auth/friends` (accepted) avec ELO, partie active, métadonnées roster |
| Haute | Chat partie | Brancher `InGameChat` sur `create` + `messages` + `send` + `WS /ws/chat/…` (aligner commentaires fichier sur routes réelles) |
| Moyenne | Annales in-game | Nouveau `GET` historique « recent » avec schéma `recentGames` |
| Moyenne | Page Histoire | `GET /api/history/` (ou `/api/games/history` paginé) selon même modèle que `mockHistoryData.json` |
| Basse | Stats complètes | Endpoint « detail » ou segments pour remplacer `mockPersonalStats` sur la page Statistiques |

---

## 7. Références fichiers frontend

| Sujet | Fichiers |
|-------|-----------|
| Panneau jeu | `GameStatsPanel.jsx`, `HistoryView.jsx`, `FriendsView.jsx`, `InGameChat.jsx`, `SummaryCards.jsx` |
| API chat | `features/chat/services/chatApi.js`, `features/chat/hooks/useChatSocket.js` |
| Mocks | `features/stats/assets/mockPersonalStats.json`, `features/history/assets/mockHistoryData.json` |
| Session dev | `mock/mockSessionUser.js` |

---

## 8. Page Paramètres — préférences locales et actions compte

Toute nouvelle donnée mock ou flux encore simulé côté SPA doit être recoupée avec une entrée dans les tableaux de routes ci-dessus (règle projet : documenter la route backend cible dans ce fichier dès que le mock est introduit ou modifié).

### 8.1 Préférences stockées dans le navigateur (frontend uniquement)

Ces données vivent dans `localStorage` côté client et ne requièrent **aucune route backend**.

| Clé localStorage | Géré par | Contenu |
|-----------------|----------|---------|
| `transcendence_ui_prefs` | `src/config/uiPrefs.js` | `reduceMotion`, `lightMode`, `showScrollbars`, `hideInviteToasts` |
| `transcendence_game_audio_v2` | `src/config/gameAudioPrefs.js` | `gameBgmVolume`, `gameBgmMuted`, `homeBgmVolume`, `homeBgmMuted`, `sfxVolume`, `sfxMuted`, `gameBgmTrackMode`, `gameBgmFixedTrack` |

Les flags `uiPrefs` sont appliqués sur `<html>` comme attributs `data-*` :
- `data-reduce-motion="true"` — accessibilité stricte, toutes animations désactivées
- `data-light-mode="true"` — mode léger, particules/aurora/glows supprimés, fond coalition conservé
- `data-show-scrollbars="true"` — barres de défilement visibles (`scrollbar-width: thin`)

### 8.2 Actions compte — routes frontend utilisées

| Action | Méthode | Route | Fichier appelant |
|--------|---------|-------|-----------------|
| Déconnexion | `POST` | `/api/auth/logout` | `AuthContext.jsx` → `logout()` |
| Voir profil | — | Route SPA `/profile` | `Link` React Router |

La page Paramètres appelle `logout({ redirectTo: '/auth' })` de `AuthContext`, qui gère CSRF + nettoyage session + redirection.

### 8.3 Purge données locales (frontend uniquement)

La page propose deux actions :

- **Réinitialiser les préférences** : efface `transcendence_ui_prefs` et `transcendence_game_audio_v2`, réapplique les défauts.
- **Effacer les données locales** : même périmètre + confirmation préalable. Ne touche ni les cookies de session ni les données serveur.

> Ces actions ne constituent pas une suppression de compte RGPD. Pour une demande de suppression serveur, un endpoint dédié est à prévoir côté backend (non implémenté dans ce lot).

---

*Mis à jour pour synchronisation backend — avril 2026 (mocks + routes Django réelles + page Paramètres étendue).*
