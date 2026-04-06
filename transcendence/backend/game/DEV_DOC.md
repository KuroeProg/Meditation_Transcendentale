# Game Backend DEV DOC

Ce document decrit le backend temps reel du module game (Django Channels + Redis), avec les routes WebSocket, les actions supportees, les payloads echanges, et les comportements metier.

## 1) Scope et composants

Le dossier game est structure en deux consumers separes:

- `MatchmakingConsumer`: gere la file d'attente et le pairing.
- `GameConsumer`: gere la partie d'echecs en temps reel (coups, horloge, nulle, abandon, reconnexion).

Le state de partie et la queue de matchmaking sont stockes dans Redis.

## 2) Routes WebSocket

Source: `game/routing.py`

- Matchmaking:
  - Route: `/ws/chess/matchmaking/`
  - Consumer: `MatchmakingConsumer`
  - Usage: rejoindre/quitter la file, recevoir `queue_status` et `match_found`

- Partie:
  - Route: `/ws/chess/<game_id>/`
  - Consumer: `GameConsumer`
  - Usage: creer/rejoindre une partie, jouer des coups, abandon, nulle, reconnexion, updates d'horloge et d'etat

Notes importantes:

- `game_id` doit matcher `\w+` (lettres/chiffres/underscore).
- Le `game_id` `matchmaking` est reserve: le `GameConsumer` refuse cette valeur.

## 3) MatchmakingConsumer

Source principale: `game/matchmaking_consumer.py`

### 3.1 Actions entrantes

Le consumer lit `action` (lowercase):

- `join_queue`
  - Payload minimal:
    - `{"action":"join_queue","player_id":42}`
  - Effet:
    - normalise `player_id` en string
    - retire le joueur de la queue si deja present
    - ajoute le joueur a la fin de `matchmaking:queue`
    - diffuse la taille de queue
    - tente un matchmaking si au moins 2 joueurs

- `leave_queue`
  - Payload minimal:
    - `{"action":"leave_queue","player_id":42}`
  - Effet:
    - retire le joueur de `matchmaking:queue`
    - diffuse la nouvelle taille

### 3.2 Evenements sortants

Le payload sortant est construit via `services/payloads.py` (`build_ws_matchmaking_payload`) et utilise toujours le champ `action`.

- `queue_status`
  - Exemple:
    - `{"action":"queue_status","queue_size":3}`

- `match_found`
  - Exemple:
    - `{"action":"match_found","game_id":"match_1712345678901_ab12cd34","white_player_id":"42","black_player_id":"84"}`

### 3.3 Logique de pairing

Source: `services/matchmaking.py`

- Queue Redis: `matchmaking:queue` (liste)
- Tant que longueur >= 2:
  - pop de 2 joueurs
  - genere `new_game_id` (format `match_<timestamp_ms>_<token_hex>`)
  - cree un state initial via `build_new_game_state(white_id, black_id)`
  - stocke ce state en Redis sous la cle `new_game_id`
  - broadcast `match_found`
  - rebroadcast `queue_status`

### 3.4 Disconnect

Au disconnect:

- retire la socket du groupe `chess_matchmaking`
- si le joueur etait en queue, le retire aussi de Redis

## 4) GameConsumer

Source principale: `game/game_consumer.py`

### 4.1 Actions entrantes et aliases

Le consumer accepte `action` ou `type`, puis normalise via des aliases.

Actions canoniques:

- `create_game`
- `reset_game`
- `play_move`
- `resign`
- `draw_offer`
- `draw_response`
- `reconnect`

Aliases supportes:

- `play`, `move` -> `play_move`
- `resign_game`, `surrender` -> `resign`
- `draw`, `offer_draw`, `propose_draw` -> `draw_offer`
- `respond_draw`, `accept_draw`, `refuse_draw` -> `draw_response`

### 4.2 Payloads entrants

- Creer une partie:
  - `{"action":"create_game","white_id":42,"black_id":84}`

- Reinitialiser une partie:
  - `{"action":"reset_game","white_id":42,"black_id":84}`

- Jouer un coup (UCI):
  - `{"action":"play_move","player_id":42,"move":"e2e4"}`

- Abandon:
  - `{"action":"resign","player_id":42}`

- Proposer une nulle:
  - `{"action":"draw_offer","player_id":42}`

- Repondre a une nulle:
  - `{"action":"draw_response","player_id":84,"accept":true}`
  - ou `{"action":"draw_response","player_id":84,"response":"accept"}`

- Reconnexion:
  - `{"action":"reconnect"}`

### 4.3 Payloads sortants

Le consumer envoie les states via:

- `{"action":"game_state","game_state":{...}}`

Erreurs envoyees en direct:

- `{"error":"JSON invalide"}`
- `{"error":"Action inconnue"}`
- `{"error":"Partie introuvable"}`
- `{"error":"Partie terminee"}`
- `{"error":"Ce n'est pas votre tour !"}`
- `{"error":"Le coup doit etre au format UCI"}`
- `{"error":"Coup illegal"}`
- etc.

### 4.4 State de partie (Redis)

State initial (extrait des champs principaux):

- `fen`
- `status` (active/checkmate/stalemate/draw/resigned/timeout)
- `white_player_id`, `black_player_id`
- `white_player_profile`, `black_player_profile`
- `white_player_coalition`, `black_player_coalition`
- `white_time_left`, `black_time_left` (secondes)
- `last_move_timestamp`
- `start_timestamp`
- `draw_offer_from_player_id`
- `moves` (historique enrichi)
- `winner_player_id` (apres fin)
- `result` (`1-0`, `0-1`, `1/2-1/2`, `*`)

### 4.5 Horloge et timeout

- Une tache `_clock_loop` tourne toutes les 1s par consumer connecte.
- Le module `clock_tick.py` pose un lock Redis (`clock_lock:<game_id>`, TTL 2s) pour eviter les updates concurrentes.
- A chaque tick:
  - decompte le temps du joueur actif
  - detecte timeout
  - persiste en Redis
  - broadcast du nouveau `game_state`

### 4.6 Reconnexion

- Au `connect`, si un state existe deja pour `game_id`, le consumer envoie immediatement un sync (`handle_reconnect`).
- `synchronize_reconnecting_player` recalcule les clocks avec le temps ecoule et complete les metadonnees manquantes.

### 4.7 Fin de partie et persistence DB

Le consumer sauvegarde les donnees de partie en base via `services/save_game.py` (transaction atomique):

- cas timeout
- cas abandon
- cas nulle acceptee
- cas fin detectee apres coup (checkmate/stalemate/draw)

Models cibles:

- `Game`
- `Move` (bulk_create)

## 5) Workflow complet (frontend)

### 5.1 Matchmaking

1. Ouvrir WS sur `/ws/chess/matchmaking/`
2. Envoyer `join_queue`
3. Ecouter:
   - `queue_status`
   - `match_found`
4. Sur `match_found`, recuperer `game_id`

### 5.2 Partie

1. Ouvrir WS sur `/ws/chess/<game_id>/`
2. Si necessaire, envoyer `reconnect`
3. Si room neuve, envoyer `create_game`
4. En jeu:
   - envoyer `play_move`, `draw_offer`, `draw_response`, `resign`
   - ecouter `game_state`
5. Fermer proprement la socket en sortie de page

## 6) Contrat de message recommande (client)

Bonnes pratiques cote frontend:

- Toujours parser les messages comme:
  - succes state: presence de `game_state`
  - evenement matchmaking: `action` en `queue_status` ou `match_found`
  - erreur: presence de `error`
- Toujours traiter `action` comme discriminant principal.
- Caster les ids en string pour comparer avec les ids renvoyes par le backend.

## 7) Notes d'integration et vigilance

- Le payload de sortie matchmaking utilise `action`, pas `type`.
- `create_game` et `reset_game` utilisent `white_id` / `black_id`.
- `play_move` attend un coup UCI (`e2e4`, `g1f3`, etc.).
- La route game ne doit pas recevoir `game_id=matchmaking`.
- Le state Redis est la source de verite temps reel; la DB sert a l'archivage en fin de partie.

## 8) Fichiers de reference

- `game/routing.py`
- `game/matchmaking_consumer.py`
- `game/game_consumer.py`
- `game/services/matchmaking.py`
- `game/services/actions.py`
- `game/services/clock.py`
- `game/services/clock_tick.py`
- `game/services/reconnect.py`
- `game/services/state_builder.py`
- `game/services/payloads.py`
- `game/services/save_game.py`
- `game/models.py`
