# Transcendence Database Architecture: Exhaustive Documentation

This document provides a highly granular, table-by-table breakdown of the Django models spanning the `accounts`, `game`, and `chat` applications. It explains every field, data type, integrity constraint, and algorithmic relation present in the system, **including Django ORM specific reverse lookups (`related_name`) and legacy field artifacts**.

The database strictly adheres to the **Third Normal Form (3NF)**, ensuring robust data integrity and leveraging strict foreign key cascading rules to handle data lifecycles automatically.

---

## 1. Identity & Social Graph (`accounts` application)

This module handles user authentication, persistent player statistics, and social networking (friend requests, blocks).

### 1.1. Table: `LocalUser` (`local_users`)
The `LocalUser` table is the core entity of the application. All other tables rely heavily on it. It serves a dual purpose: Authentication (Identity Provider) and Player Statistics.

#### Fields
- **Authentication & Core**
  - `id` *(Primary Key)*: Auto-incrementing integer.
  - `username` *(CharField, max 150)*: The unique display name of the player. Enforces a `UNIQUE` constraint at the database level.
  - `password_hash` *(CharField, max 255)*: The cryptographically secured password string (e.g., Argon2id).
  - `email` *(EmailField)*: Used for password recovery and 2FA. `blank=True`.
  - `is_2fa_enabled` *(BooleanField)*: Flags if the user opted into email-based 2FA. Defaults to `True`.
  - `is_2fa_verified` *(BooleanField)*: Tracks if the user has successfully passed the 2FA checkpoint during their current session lifecycle. Defaults to `True` (used for logic state management).

- **Profile & Customization**
  - `first_name`, `last_name` *(CharField, max 150)*: Optional real-world identity fields.
  - `bio` *(TextField)*: Optional biography string. `blank=True, default=''`.
  - `avatar` *(ImageField)*: Local uploaded image file path. Uploads to `avatars/`. `null=True, blank=True`.
  - `image_url` *(URLField)*: External image link (used primarily for 42 Intra OAuth avatars).
  - `coalition` *(CharField, max 50)*: The 42 school coalition the user belongs to (e.g., "feu", "eau").
  - `level` *(FloatField)*: The 42 school cursus level, fetched via OAuth. `null=True, blank=True`.
  - `client_prefs` *(JSONField)*: Stores a JSON object containing frontend persistent preferences (e.g., dark mode, UI sounds) without needing a dedicated table. `null=True`.

- **Presence & Live State**
  - `is_online` *(BooleanField)*: Tracks live WebSocket presence. Defaults to `False`.
  - `last_seen` *(DateTimeField)*: Timestamp of the last disconnection. `null=True`.

- **Game Statistics (Aggregated)**
  - `elo_bullet`, `elo_blitz`, `elo_rapid` *(IntegerField)*: Independent Elo ratings representing the player's skill in different time formats. Starts at a default of `1200`.
  - `games_played`, `games_won`, `games_lost`, `games_draw` *(IntegerField)*: Cached denormalized counters for quick profile rendering without needing costly `COUNT()` queries on the `Game` table. Defaults to `0`.

---

### 1.2. Table: `Friendship` (`friendships`)
Manages the directed social graph between two `LocalUser` entities.

#### Fields
- `id` *(Primary Key)*: Auto-incrementing integer.
- `status` *(CharField, max 20)*: State machine enum. Can be `pending`, `accepted`, or `blocked`.
- `created_at` *(DateTimeField)*: Auto-updates on creation.
- `updated_at` *(DateTimeField)*: Auto-updates on every modification.

#### Relationships & Constraints
- `from_user` *(ForeignKey to LocalUser)*: The user who initiated the request.
  - **Constraint**: `ON DELETE CASCADE`.
  - **ORM Reverse Lookup**: `user.friendships_sent`.
- `to_user` *(ForeignKey to LocalUser)*: The user receiving the request.
  - **Constraint**: `ON DELETE CASCADE`.
  - **ORM Reverse Lookup**: `user.friendships_received`.
- `blocked_by` *(ForeignKey to LocalUser)*: Identifies which user triggered the `blocked` status.
  - **Constraint**: `ON DELETE SET_NULL`. If the blocker is deleted, the block is lifted (nullified). `null=True, blank=True`.
  - **ORM Reverse Lookup**: `user.friendships_blocked`.
- **Table Constraint**: `unique_together = ('from_user', 'to_user')`. Prevents duplicate pending requests or overlapping relationships between the same pair of users.

---

## 2. Match Archiving (`game` application)

This module handles the immutable, permanent records of completed chess matches. *Note: Live games run in Redis to prevent DB bottlenecks; they are only flushed to these tables when the match concludes.*

### 2.1. Table: `Game` (`games`)
Represents the overarching metadata and outcome of a finished match.

#### Fields
- `id` *(Primary Key)*: Auto-incrementing integer.
- `time_category` *(CharField, max 32)*: Inferred category (`bullet`, `blitz`, `rapid`) used to determine which Elo pool to update. Defaults to `'rapid'`.
- `is_competitive`, `is_rated` *(BooleanField)*: Flags distinguishing between ranked games (which impact Elo) and casual/training matches.
- `game_mode` *(CharField, max 32)*: Extensibility field (e.g., `standard`, `custom`). Defaults to `'standard'`.
- `termination_reason` *(CharField, max 32)*: Why the game ended (e.g., `checkmate`, `timeout`, `resign`, `draw`). `blank=True`.
- `duration_seconds` *(PositiveIntegerField)*: Total time the match lasted in real life. `null=True`.
- `started_at` *(DateTimeField)*: Match start timestamp.

- **[Deep Verification Note: Legacy Schema Duplication]**
  There are duplicated fields in this table (`time_control_seconds` vs `time_control`, and `increment_seconds` vs `increment`).
  *Architectural Note*: These are not accidental bugs, but a deliberate **Soft Deprecation** strategy for backward compatibility. 
  - **On Write**: The backend deliberately saves data to both columns simultaneously to ensure older queries don't break.
  - **On Read**: The API uses a robust logical fallback (`game.time_control_seconds or game.time_control`) to read whatever is available.
  The modern, officially supported fields exposed to the frontend are strictly the ones ending in `_seconds`.

- **Elo Tracking (Historical Snapshot)**
  - `elo_white_before`, `elo_black_before` *(IntegerField)*: The Elo of the players at the exact moment the match started. Defaults to `1200`.
  - `elo_delta_white`, `elo_delta_black` *(IntegerField)*: How many points were gained or lost (+15, -14). Defaults to `0`.

#### Relationships & Constraints
- `player_white` *(ForeignKey to LocalUser)*:
  - **Constraint**: `ON DELETE SET_NULL`. `null=True`.
  - **ORM Reverse Lookup**: `user.games_as_white`.
- `player_black` *(ForeignKey to LocalUser)*:
  - **Constraint**: `ON DELETE SET_NULL`. `null=True`.
  - **ORM Reverse Lookup**: `user.games_as_black`.
- `winner` *(ForeignKey to LocalUser)*: The victor. Null if the game was a draw.
  - **Constraint**: `ON DELETE SET_NULL`. `null=True, blank=True`.
  - **ORM Reverse Lookup**: `user.chess_games_won`.

---

### 2.2. Table: `Move` (`moves`)
Records the precise sequence of actions within a `Game`. Used for game replays and advanced tactical analysis (e.g., calculating blunder rates or time-pressure mistakes).

#### Fields
- `id` *(Primary Key)*: Auto-incrementing integer.
- `move_number` *(PositiveIntegerField)*: The sequential order of the move in the match (1, 2, 3...).
- `san_notation` *(CharField, max 20)*: Standard Algebraic Notation of the move (e.g., `Nxf3+`, `e4`, `O-O`).
- `piece_played` *(CharField, max 20)*: Explicit string representation of the moved piece (`pawn`, `knight`, etc.) for easier statistical parsing.
- `time_taken_ms` *(PositiveIntegerField)*: The exact milliseconds the player spent thinking before executing this move.
- `material_advantage` *(IntegerField)*: The engine evaluation of material difference after the move (e.g., +3 means White is up a piece). Defaults to `0`.

#### Relationships & Constraints
- `game` *(ForeignKey to Game)*: The parent match.
  - **Constraint**: `ON DELETE CASCADE`. If a `Game` is pruned from the database, all its 50+ associated `Move` rows are immediately purged.
  - **ORM Reverse Lookup**: `game.moves`.
- `player` *(ForeignKey to LocalUser)*: The specific player who made this move.
  - **Constraint**: `ON DELETE SET_NULL`. `null=True`.
  - **ORM Reverse Lookup**: `user.moves_played`.
- **Meta Options**: `ordering = ['game', 'move_number']` ensures chronologically sorted querysets by default.

---

## 3. Communication & Matchmaking (`chat` application)

This module handles instant messaging and the transactional flow of proposing/accepting game challenges directly within a chat.

### 3.1. Table: `Conversation` (`chat_conversations`)
A logical container holding a thread of messages.

#### Fields
- `id` *(Primary Key)*: Auto-incrementing integer.
- `type` *(CharField, max 20)*: Determines context. Can be `private` (Direct Messages) or `game` (live chat room attached to an ongoing match).
- `game_id` *(CharField, max 255)*: If `type` is `game`, this holds the Redis Match ID (e.g., `match_1234`). `null=True, blank=True`.
- `created_at`, `updated_at` *(DateTimeField)*: `updated_at` is used to sort the conversation list (most recently active at the top).

#### Relationships & Constraints
- `participants` *(ManyToManyField to LocalUser)*: The users who have access to this thread.
  - **ORM Reverse Lookup**: `user.conversations`.
- **Meta Options**: `ordering = ['-updated_at']`.

---

### 3.2. Table: `Message` (`chat_messages`)
An individual message payload inside a conversation.

#### Fields
- `id` *(Primary Key)*: Auto-incrementing integer.
- `content` *(TextField)*: The raw text of the message.
- `message_type` *(CharField, max 20)*: Indicates how the frontend should render the message. (`text`, `system`, or `game_invite`). Defaults to `'text'`.
- `created_at` *(DateTimeField)*: Timestamp.

#### Relationships & Constraints
- `conversation` *(ForeignKey to Conversation)*: The parent thread.
  - **Constraint**: `ON DELETE CASCADE`.
  - **ORM Reverse Lookup**: `conversation.messages`.
- `sender` *(ForeignKey to LocalUser)*: The author.
  - **Constraint**: `ON DELETE CASCADE`.
  - **ORM Reverse Lookup**: `user.sent_messages`.
- `read_by` *(ManyToManyField to LocalUser)*: A list of participants who have seen this message. Used to compute "Unread" badges efficiently. `blank=True`.
  - **ORM Reverse Lookup**: `user.read_messages`.

---

### 3.3. Table: `GameInvite` (`chat_game_invites`)
A complex state-machine entity tracking a formal challenge sent from one user to another.

#### Fields
- `id` *(Primary Key)*: Auto-incrementing integer.
- `time_control_seconds` *(PositiveIntegerField)*: The proposed clock rules. Defaults to `600`.
- `increment_seconds` *(PositiveSmallIntegerField)*: Defaults to `0`.
- `competitive` *(BooleanField)*: Is the challenge rated? Defaults to `False`.
- `status` *(CharField, max 20)*: The current state (`pending`, `accepted`, `declined`, `cancelled`, `expired`). Defaults to `pending`.
- `cancel_reason` *(CharField, max 40)*: Context if cancelled. `null=True, blank=True`.
- `game_id` *(CharField, max 255)*: If accepted, stores the generated Redis Match ID to launch the game. `null=True, blank=True`.
- `expires_at`, `responded_at`, `created_at`, `updated_at` *(DateTimeField)*: Lifecyle timestamps.

#### Relationships & Constraints
- `conversation` *(ForeignKey to Conversation)*: The chat thread where the invite was sent.
  - **Constraint**: `ON DELETE CASCADE`.
  - **ORM Reverse Lookup**: `conversation.game_invites`.
- `sender` *(ForeignKey to LocalUser)*: The challenger.
  - **Constraint**: `ON DELETE CASCADE`.
  - **ORM Reverse Lookup**: `user.sent_game_invites`.
- `receiver` *(ForeignKey to LocalUser)*: The challenged.
  - **Constraint**: `ON DELETE CASCADE`.
  - **ORM Reverse Lookup**: `user.received_game_invites`.
- `source_message` *(OneToOneField to Message)*: Links this logical invite to the physical message bubble rendered in the chat UI.
  - **Constraint**: `ON DELETE SET_NULL`. `null=True, blank=True`.
  - **ORM Reverse Lookup**: `message.game_invite_meta`.

#### Advanced Database Constraints (Meta)
To guarantee strict transactional integrity, this table uses explicit PostgreSQL-level constraints:
1. `chat_game_invite_sender_receiver_different`: Check Constraint. `sender` cannot be the same as `receiver` (cannot challenge yourself).
2. `chat_one_pending_outgoing_invite_per_sender`: Unique Constraint. A user can only have **one** active `pending` invite to a specific person at a time, preventing challenge spamming.
3. **Database Indexes**: Explicit B-Tree indexes are created on `(receiver, status)`, `(sender, status)`, and `(status, expires_at)` to heavily optimize the querying of pending invites.
