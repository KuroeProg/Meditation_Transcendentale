# WebSocket Consumers Architecture

## Overview

The game system is built on two specialized WebSocket consumers that handle real-time chess gameplay and matchmaking. They communicate via Django Channels and Redis, with all game logic delegated to service modules.

**Design principle**: Clean separation of concerns between game state management (business logic) and I/O operations (WebSocket + Redis).

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (WebSocket)                    │
└──────────┬──────────────────────────────┬───────────────────────┘
           │                              │
           ▼                              ▼
   ┌──────────────────┐         ┌────────────────────┐
   │  GameConsumer    │         │MatchmakingConsumer │
   │  (Chess Game)    │         │ (Queue + Pairing)  │
   └──────┬───────────┘         └──────────┬─────────┘
          │                               │
          ├─────────────┬─────────────────┤
          │             │                 │
          ▼             ▼                 ▼
      ┌────────────────────────────────────────┐
      │         Django Channels Layer          │
      │   (Group broadcasts, event routing)    │
      └────────────────────────────────────────┘
          │             │                 │
          ▼             ▼                 ▼
      ┌────────────────────────────────────────┐
      │         Redis (Shared state)           │
      │   - Game states (FEN, clocks)          │
      │   - Matchmaking queues                 │
      │   - Session data                       │
      └────────────────────────────────────────┘
          │             │                 │
          ▼             ▼                 ▼
   ┌──────────┐  ┌──────────┐    ┌──────────────┐
   │  Actions │  │  Clock   │    │  Matchmaking │
   │ Services │  │ Services │    │  Services    │
   └──────────┘  └──────────┘    └──────────────┘
```

---

## GameConsumer - Chess Game Logic

**File**: `game_consumer.py`

**Purpose**: Orchestrates real-time chess gameplay over WebSocket.

### Key Responsibilities

1. **Move Processing**: Accept, validate, and apply chess moves
2. **Clock Management**: Tick game clock every second, detect timeouts
3. **Draw Flow**: Handle draw offers and responses
4. **Resignation**: Process game endings
5. **Reconnection**: Synchronize state for disconnected players
6. **Broadcasting**: Notify all players of state changes

### State Storage

- **Location**: Redis (key: `game_id`)
- **Format**: JSON-serialized game state containing:
  ```json
  {
    "white_id": 42,
    "black_id": 84,
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "status": "active",  // active, checkmate, stalemate, resigned, draw
    "winner": null,      // null or player_id
    "clocks": {
      "white": 600.0,
      "black": 600.0,
      "white_last_tick": 1704067200.123,
      "black_last_tick": 1704067200.123
    },
    "turn": "white",
    "draw_state": {
      "offered_by": null,
      "pending_response_from": null
    },
    "white_profile": { "coalition": "feu", "username": "player1" },
    "black_profile": { "coalition": "air", "username": "player2" }
  }
  ```

### Action Dispatcher

| Raw Action | Canonical Action | Handler | Purpose |
|---|---|---|---|
| `play`, `move` | `play_move` | `handle_play_move()` | Apply chess move |
| `resign_game`, `surrender` | `resign` | `handle_resign()` | End game |
| `draw`, `offer_draw`, `propose_draw` | `draw_offer` | `handle_draw_offer()` | Offer draw |
| `respond_draw`, `accept_draw`, `refuse_draw` | `draw_response` | `handle_draw_response()` | Accept/reject draw |
| `reconnect` | `reconnect` | `handle_reconnect()` | Re-sync client |
| `create_game` | `create_game` | `handle_create_game()` | Initialize new game |
| `reset_game` | `reset_game` | Deletes Redis key + creates new | Restart game |

### Request/Response Flow

#### 1. Create Game
```
Client → {"action": "create_game", "white_id": 42, "black_id": 84}
         ↓
    Create new game state with initial FEN
    Store in Redis
    Broadcast to all connected clients
Client ← {"game_state": {...}, "action": "create_game"}
```

#### 2. Play Move
```
Client → {"action": "play_move", "player_id": 42, "move": "e2e4"}
         ↓
    Load game state from Redis
    Apply elapsed time for clock decay
    Check timeout (if time exceeded, mark game as lost)
    Validate move (legal in current position)
    Apply move to FEN
    Check game status (checkmate, stalemate, etc.)
    Store updated state in Redis
    Broadcast to all players
Client ← {"game_state": {...}, "action": "play_move"}
```

#### 3. Clock Tick (Every 1 Second)
```
_clock_loop() triggers every 1000ms
         ↓
    tick_game_clock():
    - Get current timestamp
    - Calculate elapsed time for active player
    - Subtract from their clock
    - Check if timeout occurred
    - If timeout: mark game as ended (lost)
    - Broadcast updated clocks
    ↓
Clients ← {"game_state": {...clocks updated...}, "action": "clock_tick"}
```

#### 4. Reconnect
```
Client → {"action": "reconnect"}
         ↓
    Load game state from Redis (or None if not found)
    Rebuild state with current timestamp
    Send to reconnecting client only
Client ← {"game_state": {...}, "action": "reconnect"}
```

### Connection Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ 1. connect()                                            │
│    - Extract game_id from URL                           │
│    - Join Django Channels group (chess_<game_id>)       │
│    - Accept WebSocket connection                        │
│    - If game exists in Redis, send prior state          │
│    - Start internal clock task (_clock_loop)            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 2. receive(text_data)                                   │
│    - Parse JSON action from client                      │
│    - Normalize action name (alias resolution)           │
│    - Route to appropriate handler                       │
│    - Handler processes and broadcasts result            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Clock ticks (async background task)                  │
│    - Every 1 second: _ticks_game_clock()                │
│    - Updates clocks, detects timeouts                   │
│    - Broadcasts state to all connected clients          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 4. disconnect(close_code)                               │
│    - Leave Django Channels group                        │
│    - Cancel clock task (_clock_loop)                    │
│    - Clean up resources                                 │
│    - Game state remains in Redis for reconnection       │
└─────────────────────────────────────────────────────────┘
```

---

## MatchmakingConsumer - Queue & Pairing

**File**: `matchmaking_consumer.py`

**Purpose**: Manage player matchmaking queue and pair players for games.

### Key Responsibilities

1. **Queue Management**: Add/remove players to/from matchmaking queue
2. **Pairing**: Attempt to match players when 2+ available
3. **Match Announcements**: Notify matched players with game details
4. **Queue Broadcasting**: Update all clients on queue size
5. **Profile Fetching**: Pull player data (coalition, username) for matched players

### State Storage

- **Location**: Redis
- **Queue Key**: `matchmaking:queue` (Redis list)
- **Format**: 
  ```
  Redis List items: ["42", "84", "1", "99"]  // player IDs in order
  ```

### Request/Response Flow

#### 1. Join Queue
```
Client → {"action": "join_queue", "player_id": 42}
         ↓
    Normalize player_id to string
    Remove from queue if already present (cleanup)
    Add to end of matchmaking:queue (Redis list)
    Broadcast queue size to all clients
    Attempt pairing (if 2+ players)
         ↓
    If pairing successful:
    - Create new game with paired players
    - Announcement event to matched players
    - Start GameConsumer flow for both
    ↓
Client ← {"type": "matchmaking", "queue_size": 3, "matched": false}
```

#### 2. Attempt Pairing (Auto-triggered when 2+ in queue)
```
    While queue length >= 2:
    ├─ Pop first player (white)
    ├─ Pop second player (black)
    ├─ Fetch profiles from database
    ├─ Create match object
    ├─ Broadcast match_found to both players with:
    │  - game_id
    │  - opponent info (username, coalition)
    │  - color (white/black)
    └─ Remove from queue
    
    Broadcast updated queue size
    ↓
Matched Clients ← {"type": "match_found", "game_id": "xyz", "color": "white", ...}
Queue Clients   ← {"type": "queue_update", "queue_size": 1}
```

#### 3. Leave Queue
```
Client → {"action": "leave_queue", "player_id": 42}
         ↓
    Remove player_id from matchmaking:queue (Redis list)
    Broadcast updated queue size
    ↓
Remaining Clients ← {"type": "queue_update", "queue_size": 2}
```

### Connection Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ 1. connect()                                            │
│    - Verify URL is matchmaking room                     │
│    - Join Django Channels group (chess_matchmaking)     │
│    - Accept WebSocket connection                        │
│    - Ready to receive queue commands                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 2. receive(text_data)                                   │
│    - Parse action: "join_queue" or "leave_queue"        │
│    - Route to appropriate handler                       │
│    - Handler modifies Redis queue                       │
│    - Broadcast queue size update                        │
│    - Trigger matching if possible                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Matching (Async in background)                       │
│    - Triggered when queue size >= 2                     │
│    - Fetch player profiles from DB                      │
│    - Create game and notify both players                │
│    - Players receive game_id and connect to GameRoom    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 4. disconnect(close_code)                               │
│    - Leave Django Channels group                        │
│    - Dequeue player if still in queue                   │
│    - Broadcast updated queue size                       │
└─────────────────────────────────────────────────────────┘
```

---

## Complete Game Flow Workflow

### Scenario: Two Players Join Queue and Play

```
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 1: Player 1 & 2 Join Matchmaking Queue                          │
└──────────────────────────────────────────────────────────────────────┘

Player 1 WebSocket → MatchmakingConsumer (matchmaking room)
   └─ Action: "join_queue", player_id: 42
      └─ Add to Redis queue: ["42"]
      └─ Broadcast: queue_size = 1

Player 2 WebSocket → MatchmakingConsumer (matchmaking room)
   └─ Action: "join_queue", player_id: 84
      └─ Add to Redis queue: ["42", "84"]
      └─ Broadcast: queue_size = 2
      └─ MATCHING TRIGGERED
         ├─ Pop 42 (white), Pop 84 (black)
         ├─ Fetch profiles from DB
         ├─ Create game_id (e.g., "game_20260330_001")
         ├─ Announce to Player 1: matched, color: white, opponent: player2
         └─ Announce to Player 2: matched, color: black, opponent: player1


┌──────────────────────────────────────────────────────────────────────┐
│ STEP 2: Players Connect to Game Room                                 │
└──────────────────────────────────────────────────────────────────────┘

Player 1 WebSocket → GameConsumer (game_20260330_001)
   └─ Action: "create_game", white_id: 42, black_id: 84
      └─ Create initial game state
      └─ Store in Redis: game_20260330_001 = { fen: "starting position", ... }
      └─ Broadcast to group: {"game_state": {...}, "action": "create_game"}
      └─ Start clock task (ticks every 1 second)

Player 2 WebSocket → GameConsumer (game_20260330_001)
   └─ Joins same group
   └─ Receives prior game state (reconnect logic)
   └─ Clock task already running


┌──────────────────────────────────────────────────────────────────────┐
│ STEP 3: Gameplay Loop (Simplified)                                   │
└──────────────────────────────────────────────────────────────────────┘

Clock Task (every 1 second):
   └─ Current time
   └─ Subtract elapsed from active player's clock
   └─ Check for timeout
   └─ Broadcast updated clocks to both players

Player 1 makes move:
   └─ Action: "play_move", player_id: 42, move: "e2e4"
      └─ Load game state from Redis
      └─ Validate move legally
      └─ Update FEN
      └─ Check game status
      └─ Save to Redis
      └─ Broadcast new state to both players

Player 2 responds:
   └─ Action: "play_move", player_id: 84, move: "e7e5"
      └─ [Same flow as Player 1]

... moves continue until checkmate, stalemate, resignation, or draw ...


┌──────────────────────────────────────────────────────────────────────┐
│ STEP 4: Game Ends & Cleanup                                          │
└──────────────────────────────────────────────────────────────────────┘

Player 1 Checkmate/Timeout/Resignation:
   └─ Game state marked as ended (winner: player_id or status: timeout)
   └─ Clock task stops
   └─ Broadcast final state with result
   └─ Game state persists in Redis (for analysis/replay)

Player 1 Disconnects:
   └─ Leaves group
   └─ Cancels clock task (if no other players)
   └─ Can reconnect: loads prior state from Redis

Game Archive:
   └─ State remains in Redis until explicitly deleted
   └─ Can be queried for game history/statistics
```

---

## Key Design Patterns

### 1. **Action Alias Resolution**
Multiple action names map to single handler:
```python
ACTION_ALIASES = {
    'play': 'play_move',
    'move': 'play_move',
    'resign_game': 'resign',
    'draw': 'draw_offer',
    ...
}
```
**Benefit**: Flexible API, backward compatibility, client flexibility

### 2. **Service Delegation**
All business logic in separate service modules:
```
Consumer handles:
  - WebSocket I/O
  - Redis state persistence
  - Django Channels group management

Services handle:
  - Move validation (actions/)
  - Clock calculation (clock/)
  - Game state building (state_builder/)
  - Payload formatting (payloads/)
```
**Benefit**: Testability, reusability, clean separation

### 3. **Async Background Clock Task**
```python
async def _clock_loop(self):
    while True:
        await asyncio.sleep(1)
        await self._tick_game_clock()
```
**Benefit**: Real-time clock updates, timeout detection, non-blocking

### 4. **Group Broadcasting via Channels**
```python
await self.channel_layer.group_send(
    self.room_group_name, 
    build_group_game_state_event(game_state)
)
```
**Benefit**: All connected clients auto-updated, scales with multiple tabs

### 5. **Redis as Single Source of Truth**
- Game state stored centrally
- Reconnection simply loads from Redis
- No local state on consumer
- Survives consumer restarts

---

## Error Handling

### Common Errors

| Error | Cause | Handled In |
|---|---|---|
| "Partie introuvable" | Game state not in Redis | `_load_game_state_or_send_error()` |
| "JSON invalid" | Malformed JSON from client | `receive()` |
| "Action inconnue" | Unknown action name | `_normalize_action()` |
| "Temps ecoule" | Clock reached 0 | `mark_timeout_if_needed()` |
| "Coup invalide" | Move not legal in position | `apply_play_move()` |
| "Partie terminee" | Attempt move in ended game | `handle_play_move()` |
| "Player ID required" | join_queue without player_id | `handle_join_queue()` |

---

## Performance Considerations

1. **Clock Ticks**: 1 per second per active game (efficient)
2. **Redis Writes**: One per move + one per clock tick = ~2-3 per minute typical
3. **Broadcasts**: O(n) where n = number of connected clients per game (usually 2)
4. **Database Queries**: Only during matchmaking (fetch profiles)
5. **Memory**: Game states small (~2KB each), queues tiny (list of IDs)

---

## Summary

| Aspect | GameConsumer | MatchmakingConsumer |
|---|---|---|
| **Purpose** | Chess game logic & sync | Player queueing & pairing |
| **WebSocket Room** | `chess_<game_id>` | `chess_matchmaking` |
| **Redis State** | Full game state (FEN, clocks, etc.) | Player IDs in ordered queue |
| **Key Process** | Move → Validate → Update → Broadcast | Queue → Match → Create Game |
| **Client Count** | Typically 2 | Variable (all waiting players) |
| **Background Task** | Clock (every 1s) | Matching (on queue change) |
| **Session Tracker** | None | Current player_id |
