# Branchement backend — panneau de stats en partie (Coups, Annales, Chat, Amis)

Ce document liste les **routes / contrats** attendus par le frontend pour remplacer les données mock du panneau latéral de jeu (`GameStatsPanel` et dérivés). Les champs optionnels sont indiqués comme tels.

## Déjà en place (à étendre si besoin)

| Usage | Méthode | Route | Notes |
|--------|---------|--------|--------|
| Liste d’amis acceptés | `GET` | `/api/auth/friends?status=accepted` | Corps : `{ friends: Friend[] }` (voir forme actuelle + champs étendus ci-dessous) |
| Partie (état) | (existant) | WebSocket + état partie | `active_game_id` / `activeGameId` sur l’utilisateur ami → bouton **Regarder** |
| Chat global | (existant) | `/api/chat/...` | Voir `InGameChat.jsx` (commentaires TODO) |

## Données souhaitées sur chaque `Friend` (liste acceptée)

Pour alimenter la section **Amis** (ELO, rivalité, statut détaillé, activité) sans mock :

| Champ (exemple) | Type | Description |
|------------------|------|-------------|
| `user.id` | int | |
| `user.username` | string | |
| `user.avatar` | string (URL) | optionnel |
| `user.coalition` | string | ex. `water` / `fire` (aligné sur le reste de l’API) |
| `user.is_online` | bool | |
| `user.elo_rapid` | number | optionnel — affiché comme ELO rapide |
| `user.active_game_id` | string \| null | si présent → **En partie** + **Regarder** → `GET /game/:id` |
| `user.active_game_label` | string | optionnel — sous-titre (ex. « Rapide — tour 18 ») |
| `friendship_id` | int | |
| `title` | string | optionnel — ex. « Grand Maître de l’Eau » (titre 42 / noblesse) |
| `streak` | `{ kind: 'wins' \| 'losses' \| 'neutral', count: number }` | optionnel |
| `trend` | `'up' \| 'down' \| 'flat'` | optionnel |
| `rivalry` | `{ wins: number, losses: number, is_opponent_coalition?: bool }` | optionnel — face-à-face coalition |
| `last_activity` | `{ kind: 'seen' \| 'last_game', label: string }` | ex. « Vu il y a 10 min » |

**Normalisation** : le frontend accepte `snake_case` ou champs issus du mock JSON (`lastActivity`, `inGame`, etc.) ; l’idéal est d’**unifier côté API** en `snake_case` pour le sérialiseur Django/DRF.

## Notation / coups (onglet Coups)

Aucune nouvelle route requise si le flux WebSocket + `moveLog` côté client reste la source. Les libellés **Blancs / Noirs** viennent des profils chargés en **Game** (`white_player_profile`, `black_player_profile` ou `user` local).

## Annales in-game (liste `recentGames`)

- **Aujourd’hui** : mock `mockPersonalStats.json` → `gamePanel.recentGames`.
- **Cible** : `GET` dédié (ex. `GET /api/games/history?scope=recent&limit=20`) retournant le même schéma que les entrées du mock (résultat, format, adversaire, PGN / trends optionnels, etc.).

## Chat de partie (optionnel, V2)

Référence commentée dans `InGameChat.jsx` :

- `GET /api/chat/conversations/?type=game&game_id=<uuid>` → `{ conversation_id }`
- `WebSocket` `/ws/chat/<conversation_id>/`
- `POST /api/chat/conversations/<id>/messages/`

## Invitations « Défier »

- **À définir** côté produit : ex. `POST /api/games/invites` avec `{ to_user_id, time_control, ... }`  
- Jusqu’alors le bouton **Défier** reste côté UI (log en dev) ou peut ouvrir le tiroir chat ciblé si vous exposez un endpoint.

---

*Généré pour synchronisation backend — avril 2026.*
