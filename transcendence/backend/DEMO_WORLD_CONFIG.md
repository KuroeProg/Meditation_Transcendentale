# Demo World Configuration Guide

This file explains the structure and customization of `demo_world_config.json`, which defines a coherent demo world for the Transcendence project.

## Overview

The config file defines:
1. **Users**: 7 archetypical players with distinct profiles
2. **Friendships**: Relationships between users (accepted/pending)
3. **Games**: Match history with realistic outcomes and ELO progression
4. **Conversations**: Message threads reflecting authentic interactions

## Configuration Structure

### Users Array

Each user defines a player profile:

```json
{
  "username": "alice_competitive",
  "password": "alicedemo123",
  "first_name": "Alice",
  "last_name": "Champion",
  "email": "alice@demo.local",
  "bio": "Competitive chess player, always grinding for rating improvements.",
  "coalition": "The Senate",
  "elo_bullet": 2100,
  "elo_blitz": 2050,
  "elo_rapid": 2100,
  "is_2fa_enabled": true,
  "is_2fa_verified": true
}
```

**Fields:**
- `username` (string, required): Unique username
- `password` (string, required): Login password
- `first_name` (string): Display name (first)
- `last_name` (string): Display name (last)
- `email` (string): User email
- `bio` (string): Profile biography
- `coalition` (string): Coalition affiliation (e.g., "The Senate", "House of Stone")
- `elo_bullet` (int): Bullet rating (time control < 3 min)
- `elo_blitz` (int): Blitz rating (3-8 min)
- `elo_rapid` (int): Rapid rating (8-25 min)
- `is_2fa_enabled` (bool): 2FA setting
- `is_2fa_verified` (bool): 2FA verification status

### Friendships Array

Defines relationships between users:

```json
{
  "from_username": "alice_competitive",
  "to_username": "bob_casual",
  "status": "accepted"
}
```

**Fields:**
- `from_username` (string): Sender of friend request
- `to_username` (string): Recipient of friend request
- `status` (string): One of `accepted`, `pending`, or `blocked`

**Note:** Friendships are directional. For bidirectional friendships, create entries in both directions with `"status": "accepted"`.

### Games Array

Defines match history with ELO tracking:

```json
{
  "player_white": "alice_competitive",
  "player_black": "bob_casual",
  "winner": "alice_competitive",
  "time_category": "rapid",
  "time_control_seconds": 600,
  "increment_seconds": 10,
  "is_rated": true,
  "termination_reason": "checkmate",
  "days_ago": 5
}
```

**Fields:**
- `player_white` (string): Username of white player
- `player_black` (string): Username of black player
- `winner` (string): Username of winner (must be one of the players)
- `time_category` (string): One of `bullet`, `blitz`, or `rapid`
- `time_control_seconds` (int): Initial time in seconds (e.g., 600 for 10min rapid)
- `increment_seconds` (int): Increment per move in seconds
- `is_rated` (bool): Whether the game affects ELO
- `termination_reason` (string): How game ended (e.g., "checkmate", "resignation", "timeout")
- `days_ago` (int): Days in the past this game occurred (for realistic timestamps)

**ELO Calculation:**
- Winner gains ~16 ELO points
- Loser loses ~16 ELO points
- This is a simplified model; real ELO uses Elo formula based on rating difference

### Conversations Array

Defines message threads between users:

```json
{
  "type": "private",
  "participants": ["alice_competitive", "bob_casual"],
  "messages": [
    {
      "sender": "alice_competitive",
      "content": "Hey Bob! Want to play a game later?",
      "message_type": "text",
      "days_ago": 2
    }
  ]
}
```

**Conversation Fields:**
- `type` (string): One of `private` or `game` (game conversations are linked to specific games)
- `participants` (array): List of usernames in the conversation
- `messages` (array): Array of message objects (see below)

**Message Fields:**
- `sender` (string): Username of message sender (must be a participant)
- `content` (string): Message text
- `message_type` (string): One of `text`, `game_invite`, or `system`
- `days_ago` (int): Days in the past this message was sent

## Customization Examples

### Add a New User

Add to the `users` array:

```json
{
  "username": "helen_speedrunner",
  "password": "helendemo123",
  "first_name": "Helen",
  "last_name": "Speed",
  "email": "helen@demo.local",
  "bio": "Lightning-fast bullet games only!",
  "coalition": "House of Stone",
  "elo_bullet": 2300,
  "elo_blitz": 1800,
  "elo_rapid": 1600,
  "is_2fa_enabled": true,
  "is_2fa_verified": true
}
```

Then add corresponding games and friendships.

### Add More Games

Add to the `games` array to create richer game history:

```json
{
  "player_white": "alice_competitive",
  "player_black": "charlie_legend",
  "winner": "charlie_legend",
  "time_category": "rapid",
  "time_control_seconds": 600,
  "increment_seconds": 10,
  "is_rated": true,
  "termination_reason": "resignation",
  "days_ago": 1
}
```

Games are processed in order, so ELO updates accumulate realistically over time.

### Add More Conversations

Add to the `conversations` array for richer social interactions:

```json
{
  "type": "private",
  "participants": ["frank_tactical", "grace_blitzer"],
  "messages": [
    {
      "sender": "frank_tactical",
      "content": "Great blitz game yesterday! Your tactics are sharp.",
      "message_type": "text",
      "days_ago": 1
    },
    {
      "sender": "grace_blitzer",
      "content": "Thanks! Your endgame technique is solid. Want to do a friendly match?",
      "message_type": "text",
      "days_ago": 1
    }
  ]
}
```

## Regeneration

After editing `demo_world_config.json`:

```bash
# With purge (removes old demo users)
make seed-demo-world SEED_ARGS="--purge"

# Without purge (adds to existing data)
make seed-demo-world
```

## Validation Tips

1. **Usernames must exist**: All usernames in friendships, games, and conversations must be defined in the `users` array.
2. **Circular references check**: Players can play against each other in games—this is natural.
3. **JSON syntax**: Validate JSON using `jq` or a JSON linter: `jq . demo_world_config.json`
4. **ELO logic**: Remember that ELO gains/losses are cumulative. If alice plays 5 games and loses 4, her final ELO will be lower than the start.

## Management Command Reference

The generation is driven by `/transcendence/backend/accounts/management/commands/generate_demo_world.py`:

```bash
# Generate from config
cd transcendence/backend
python manage.py generate_demo_world

# Purge demo users before regenerating
python manage.py generate_demo_world --purge

# Use custom config file
python manage.py generate_demo_world --config path/to/config.json
```

## Troubleshooting

**Error: "Config file not found"**
- Ensure `demo_world_config.json` is in `/transcendence/backend/`
- Or use `--config /path/to/file.json`

**Error: "MultipleObjectsReturned"**
- This shouldn't happen with current code; if it does, run with `--purge` first

**No users created but no error**
- Check Django logs: `docker compose logs backend`
- Verify JSON syntax: `jq . demo_world_config.json`

**ELO doesn't match expectations**
- Remember: ELO updates accumulate per game in order
- Higher-rated players winning increases their ELO less than lower-rated players winning
- Use the simplified +16/-16 model for planning
